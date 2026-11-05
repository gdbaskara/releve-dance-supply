/**
 * Order service — buyer side (CHK-07, STK-03/05/06, ORD-01..03, PAY-09/10). Server-only.
 * createOrder follows docs/05 §4 exactly: one transaction with atomic conditional reservations.
 */
import { randomInt, randomUUID } from "node:crypto";
import { and, eq, gt, isNull, sql } from "drizzle-orm";
import { TZDate } from "@date-fns/tz";
import { format } from "date-fns";
import { db } from "@/db";
import { checkoutLinks, orderItems, orders, payments, stockReservations, variants } from "@/db/schema";
import {
  PAYMENT_EXPIRY_MINUTES,
  PREORDER_MAX_QTY,
  RESERVATION_GRACE_MINUTES,
  type CreateOrderInput,
  type CreateOrderResult,
  type Locale,
  type OrderPublicView,
  type OrderStatus,
  type PaymentChannel,
  type PaymentInstruction,
  type PaymentMethod,
} from "@/lib/contracts";
import { TZ } from "@/lib/format/date";
import { getPaymentProvider } from "@/lib/providers";
import type { Tx } from "./db-types";
import { createOrderInputSchema, paymentSelectionSchema } from "./schemas";
import { loadVariants, mergeItems } from "./cart";
import { lookupZone, quoteRates } from "./shipping";
import { applyVoucher } from "./voucher";
import { variantLabel } from "./labels";
import { releaseReservations } from "./stock-ops";
import { expireOrders } from "./expiry";
import { log, notifyOrder, urls } from "./notify";
import type { StockChange } from "./low-stock";
import { notifyLowStock } from "./low-stock-notify";
import { buildOrderView, loadOrderBundle, toPaymentView } from "./order-view";

/* ---------- order number ---------- */

const BASE32 = "0123456789ABCDEFGHJKMNPQRSTVWXYZ"; // Crockford (no I, L, O, U)

/** RDS-YYMMDD-XXXX — date in WIB, 4 random Crockford base32 chars (ORD-01). */
export function generateOrderNo(now: Date = new Date()): string {
  const date = format(new TZDate(now, TZ), "yyMMdd");
  let suffix = "";
  for (let i = 0; i < 4; i++) suffix += BASE32[randomInt(0, 32)];
  return `RDS-${date}-${suffix}`;
}

async function uniqueOrderNo(tx: Tx, now: Date): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt++) {
    const candidate = generateOrderNo(now);
    const [hit] = await tx.select({ id: orders.id }).from(orders).where(eq(orders.orderNo, candidate)).limit(1);
    if (!hit) return candidate;
  }
  throw new Error("Could not allocate a unique order number");
}

/* ---------- createOrder ---------- */

class OutOfStockError extends Error {
  constructor(readonly skus: string[]) {
    super("OUT_OF_STOCK");
  }
}
class LinkExpiredError extends Error {}

function invalid(message: string): CreateOrderResult {
  return { ok: false, error: "INVALID_INPUT", message };
}

/** Accepts `unknown` so actions can pass client payloads straight through; validated with Zod here. */
export async function createOrder(rawInput: CreateOrderInput | unknown, opts: { now?: Date } = {}): Promise<CreateOrderResult> {
  const now = opts.now ?? new Date();
  const parsed = createOrderInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return invalid(`${issue.path.join(".")}: ${issue.message}`);
  }
  const input = parsed.data;

  // 1. Address → zone (server-side; Java only)
  const zone = lookupZone(input.address.province, input.address.city);
  if (!zone.ok) {
    return zone.error === "OUTSIDE_JAVA" ? { ok: false, error: "OUTSIDE_JAVA" } : invalid("address.city: UNKNOWN_CITY");
  }

  // 2. Checkout link (items locked to the link)
  let items = mergeItems(input.items);
  let linkId: string | null = null;
  if (input.checkoutLinkToken) {
    const [link] = await db.select().from(checkoutLinks).where(eq(checkoutLinks.token, input.checkoutLinkToken)).limit(1);
    if (!link || link.usedOrderId || link.expiresAt <= now) return { ok: false, error: "LINK_EXPIRED" };
    linkId = link.id;
    items = mergeItems(link.items);
  }
  if (items.length === 0) return invalid("items: EMPTY_CART");

  // 3. Re-price from DB (client prices are never used)
  const vmap = await loadVariants(items.map((i) => i.sku));
  const unknown = items.filter((i) => !vmap.get(i.sku)?.isActive).map((i) => i.sku);
  if (unknown.length) return invalid(`items: UNKNOWN_SKU ${unknown.join(",")}`);
  const subtotalIdr = items.reduce((s, i) => s + vmap.get(i.sku)!.priceIdr * i.qty, 0);
  const weightGrams = items.reduce((s, i) => s + vmap.get(i.sku)!.weightGrams * i.qty, 0);

  // 4. Voucher
  let discountIdr = 0;
  let voucherCode: string | null = null;
  if (input.voucherCode) {
    const v = await applyVoucher(input.voucherCode, subtotalIdr, now);
    if (!v.ok) return { ok: false, error: "INVALID_VOUCHER", message: v.error };
    discountIdr = v.discountIdr;
    voucherCode = v.code;
  }

  // 5. Shipping re-quote
  const quote = await quoteRates(input.address, weightGrams, subtotalIdr, now);
  if (!quote.ok) return { ok: false, error: "INVALID_SHIPPING", message: quote.error };
  const rate = quote.rates.find((r) => r.serviceCode === input.shippingServiceCode);
  if (!rate) return { ok: false, error: "INVALID_SHIPPING", message: "SERVICE_UNAVAILABLE" };
  const insuranceIdr = input.insured ? rate.insuranceIdr : 0;
  const totalIdr = subtotalIdr - discountIdr + rate.priceIdr + insuranceIdr;

  const paymentExpiresAt = new Date(now.getTime() + PAYMENT_EXPIRY_MINUTES[input.method] * 60_000);
  const reservationExpiresAt = new Date(paymentExpiresAt.getTime() + RESERVATION_GRACE_MINUTES * 60_000);

  // 6. Transaction: reservations (atomic conditional UPDATE) + order + items
  let created: typeof orders.$inferSelect;
  let stockChanges: StockChange[] = [];
  try {
    ({ order: created, stockChanges } = await db.transaction(async (tx) => {
      const failing: string[] = [];
      const plan: { sku: string; qty: number; isPreorder: boolean }[] = [];
      const reservedChanges: StockChange[] = [];
      for (const it of [...items].sort((a, b) => a.sku.localeCompare(b.sku))) {
        const reservedRows = await tx
          .update(variants)
          .set({ reserved: sql`${variants.reserved} + ${it.qty}`, updatedAt: now })
          .where(and(eq(variants.sku, it.sku), sql`${variants.onHand} - ${variants.reserved} >= ${it.qty}`))
          .returning({ sku: variants.sku, onHand: variants.onHand, reserved: variants.reserved });
        if (reservedRows.length === 1) {
          plan.push({ sku: it.sku, qty: it.qty, isPreorder: false });
          const after = reservedRows[0].onHand - reservedRows[0].reserved;
          reservedChanges.push({ sku: it.sku, before: after + it.qty, after });
          continue;
        }
        const [cur] = await tx.select().from(variants).where(eq(variants.sku, it.sku)).for("update");
        const available = cur ? cur.onHand - cur.reserved : 0;
        if (cur && available <= 0 && cur.preorderEnabled && it.qty <= PREORDER_MAX_QTY) {
          plan.push({ sku: it.sku, qty: it.qty, isPreorder: true });
        } else {
          failing.push(it.sku);
        }
      }
      if (failing.length) throw new OutOfStockError(failing);

      const orderNo = await uniqueOrderNo(tx, now);
      const orderId = randomUUID();
      const address = { ...input.address, province: input.address.province as never, zone: zone.zone };
      const [o] = await tx
        .insert(orders)
        .values({
          id: orderId,
          orderNo,
          status: "PENDING_PAYMENT",
          locale: input.locale,
          customerName: input.contact.name,
          customerWa: input.contact.wa,
          customerEmail: input.contact.email ?? null,
          waOptIn: input.contact.waOptIn,
          address,
          shipping: {
            serviceCode: rate.serviceCode, courier: rate.courier, service: rate.service, type: rate.type,
            priceIdr: rate.priceIdr, eta: rate.eta, etaUnit: rate.etaUnit, insured: input.insured,
          },
          subtotalIdr,
          shippingIdr: rate.priceIdr,
          insuranceIdr,
          discountIdr,
          totalIdr,
          voucherCode,
          checkoutLinkId: linkId,
          hasPreorder: plan.some((p) => p.isPreorder),
          expiresAt: paymentExpiresAt,
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      await tx.insert(orderItems).values(
        plan.map((p) => {
          const v = vmap.get(p.sku)!;
          return {
            orderId, sku: p.sku, productId: v.productId, nameSnapshot: v.name, variantLabel: variantLabel(v),
            priceIdr: v.priceIdr, qty: p.qty, isPreorder: p.isPreorder,
          };
        }),
      );
      const toReserve = plan.filter((p) => !p.isPreorder);
      if (toReserve.length) {
        await tx.insert(stockReservations).values(
          toReserve.map((p) => ({ orderId, sku: p.sku, qty: p.qty, expiresAt: reservationExpiresAt, createdAt: now })),
        );
      }
      if (linkId) {
        const used = await tx
          .update(checkoutLinks)
          .set({ usedOrderId: orderId })
          .where(and(eq(checkoutLinks.id, linkId), isNull(checkoutLinks.usedOrderId), gt(checkoutLinks.expiresAt, now)))
          .returning({ id: checkoutLinks.id });
        if (used.length === 0) throw new LinkExpiredError();
      }
      return { order: o, stockChanges: reservedChanges };
    }));
  } catch (err) {
    if (err instanceof OutOfStockError) {
      log("order.out_of_stock", { skus: err.skus });
      return { ok: false, error: "OUT_OF_STOCK", skus: err.skus };
    }
    if (err instanceof LinkExpiredError) return { ok: false, error: "LINK_EXPIRED" };
    throw err;
  }

  // 7. Payment (after commit) — on provider failure, roll the order back to CANCELLED and release stock
  let instruction: PaymentInstruction;
  try {
    instruction = await createPaymentRecord(created, input.method, input.channel, now);
  } catch (err) {
    await db.transaction(async (tx) => {
      await releaseReservations(tx, created.id, now);
      await tx.update(orders).set({ status: "CANCELLED", cancelledAt: now, updatedAt: now }).where(eq(orders.id, created.id));
    });
    throw err;
  }
  log("order.created", { orderNo: created.orderNo, totalIdr, method: input.method });

  // 7b. Low-stock alert to the admin (STK-09) — only once the order and its payment exist
  await notifyLowStock(stockChanges);

  // 8. ORDER_CREATED (opt-in)
  await notifyOrder({ ...created, locale: created.locale as Locale }, "ORDER_CREATED", instruction);
  return { ok: true, orderNo: created.orderNo, payUrl: `/${created.locale}/pay/${created.orderNo}` };
}

/** Calls the provider, stores the payment and aligns order/reservation expiry with the provider's expiry. */
async function createPaymentRecord(
  o: typeof orders.$inferSelect,
  method: PaymentMethod,
  channel: PaymentChannel | undefined,
  now: Date,
): Promise<PaymentInstruction> {
  const provider = getPaymentProvider();
  const locale = o.locale as Locale;
  const instruction = await provider.createPayment({
    orderId: o.id,
    orderNo: o.orderNo,
    amountIdr: o.totalIdr,
    method,
    channel: method === "VA" || method === "EWALLET" ? channel : undefined,
    customer: { name: o.customerName, wa: o.customerWa, email: o.customerEmail ?? undefined },
    successRedirectUrl: urls.success(locale, o.orderNo),
  });
  await db.transaction(async (tx) => {
    await tx.insert(payments).values({
      orderId: o.id,
      provider: provider.name,
      method: instruction.method,
      channel: instruction.channel ?? null,
      status: "PENDING",
      amountIdr: o.totalIdr,
      providerRef: instruction.providerRef,
      qrString: instruction.qrString ?? null,
      vaNumber: instruction.vaNumber ?? null,
      redirectUrl: instruction.redirectUrl ?? null,
      expiresAt: instruction.expiresAt,
      raw: { instruction },
      createdAt: now,
    });
    await tx.update(orders).set({ expiresAt: instruction.expiresAt, updatedAt: now }).where(eq(orders.id, o.id));
    await tx
      .update(stockReservations)
      .set({ expiresAt: new Date(instruction.expiresAt.getTime() + RESERVATION_GRACE_MINUTES * 60_000) })
      .where(and(eq(stockReservations.orderId, o.id), isNull(stockReservations.releasedAt), isNull(stockReservations.consumedAt)));
  });
  return instruction;
}

/* ---------- reads ---------- */

/** ORD-03: requires the last 4 digits of the buyer's WA. Mismatch / unknown → null (generic not-found). */
export async function getOrderPublic(orderNo: string, waLast4: string): Promise<OrderPublicView | null> {
  const no = orderNo.trim().toUpperCase();
  await expireOrders(new Date(), { orderNo: no });
  const b = await loadOrderBundle(no);
  const digits = waLast4.replace(/\D/g, "");
  if (!b || digits.length !== 4 || !b.order.customerWa.endsWith(digits)) return null;
  return buildOrderView(b);
}

/** Pay & success pages: by order number only (the number is unguessable enough for the demo). */
export async function getOrderForPayPage(orderNo: string): Promise<OrderPublicView | null> {
  const no = orderNo.trim().toUpperCase();
  await expireOrders(new Date(), { orderNo: no });
  const b = await loadOrderBundle(no);
  return b ? buildOrderView(b) : null;
}

export interface OrderStatusView {
  orderNo: string;
  status: OrderStatus;
  payment: OrderPublicView["payment"];
}

/** Lightweight status for the 5 s poll on the pay page (PAY-06). */
export async function getOrderStatus(orderNo: string): Promise<OrderStatusView | null> {
  const no = orderNo.trim().toUpperCase();
  await expireOrders(new Date(), { orderNo: no });
  const [o] = await db.select().from(orders).where(eq(orders.orderNo, no)).limit(1);
  if (!o) return null;
  const [p] = await db.select().from(payments).where(eq(payments.orderId, o.id)).orderBy(sql`${payments.createdAt} desc`).limit(1);
  return { orderNo: o.orderNo, status: o.status as OrderStatus, payment: toPaymentView(p) };
}

/* ---------- payment method change & instructions ---------- */

export type ChangePaymentResult =
  | { ok: true; payment: NonNullable<OrderPublicView["payment"]> }
  | { ok: false; error: "NOT_FOUND" | "NOT_PENDING" | "INVALID_INPUT" };

/** PAY-10: cancels the current payment, creates a new one; reservations stay (expiry extended). */
export async function changePaymentMethod(orderNo: string, method: PaymentMethod, channel?: PaymentChannel): Promise<ChangePaymentResult> {
  const sel = paymentSelectionSchema.safeParse({ method, channel });
  if (!sel.success) return { ok: false, error: "INVALID_INPUT" };
  const now = new Date();
  const no = orderNo.trim().toUpperCase();
  await expireOrders(now, { orderNo: no });
  const provider = getPaymentProvider();
  const cancelled = await db.transaction(async (tx) => {
    const [o] = await tx.select().from(orders).where(eq(orders.orderNo, no)).for("update");
    if (!o) return { error: "NOT_FOUND" as const };
    if (o.status !== "PENDING_PAYMENT") return { error: "NOT_PENDING" as const };
    const pending = await tx
      .update(payments)
      .set({ status: "CANCELLED" })
      .where(and(eq(payments.orderId, o.id), eq(payments.status, "PENDING")))
      .returning({ providerRef: payments.providerRef });
    return { order: o, refs: pending.map((p) => p.providerRef) };
  });
  if ("error" in cancelled) return { ok: false, error: cancelled.error! };
  for (const ref of cancelled.refs) {
    try {
      await provider.cancelPayment(ref);
    } catch (err) {
      console.error(JSON.stringify({ event: "payment.cancel_failed", ref, error: String(err) }));
    }
  }
  const instruction = await createPaymentRecord(cancelled.order, sel.data.method, sel.data.channel, now);
  log("payment.method_changed", { orderNo: no, method });
  return {
    ok: true,
    payment: {
      method: instruction.method,
      channel: instruction.channel,
      status: "PENDING",
      expiresAt: instruction.expiresAt,
      qrString: instruction.qrString,
      vaNumber: instruction.vaNumber,
      redirectUrl: instruction.redirectUrl,
    },
  };
}

/** PAY-09: queue PAYMENT_INSTRUCTIONS to the buyer's WA (explicit request → sent even without opt-in). */
export async function sendPaymentInstructions(orderNo: string): Promise<{ ok: true } | { ok: false; error: "NOT_FOUND" | "NOT_PENDING" }> {
  const b = await loadOrderBundle(orderNo);
  if (!b) return { ok: false, error: "NOT_FOUND" };
  const p = b.payments.find((x) => x.status === "PENDING");
  if (b.order.status !== "PENDING_PAYMENT" || !p) return { ok: false, error: "NOT_PENDING" };
  await notifyOrder({ ...b.order, locale: b.order.locale as Locale }, "PAYMENT_INSTRUCTIONS", p, undefined, { force: true });
  return { ok: true };
}
