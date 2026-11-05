/** Admin order service (ADM-02/04, SHP-03). Server-only. Callers must check requireAdmin(). */
import { and, asc, count, desc, eq, gte, ilike, inArray, isNull, or, sql, type SQL } from "drizzle-orm";
import { TZDate } from "@date-fns/tz";
import { startOfDay } from "date-fns";
import { db } from "@/db";
import { backInStockRequests, orderItems, orders, payments, stockMovements, stockReservations, variants, waOutbox } from "@/db/schema";
import {
  LOW_STOCK_THRESHOLD,
  canTransition,
  ORDER_TRANSITIONS,
  type Locale,
  type OrderPublicView,
  type OrderStatus,
  type PaymentChannel,
  type PaymentMethod,
} from "@/lib/contracts";
import { TZ } from "@/lib/format/date";
import { getPaymentProvider } from "@/lib/providers";
import { buildOrderView, loadOrderBundle } from "./order-view";
import { releaseReservations, notifyBackInStock } from "./stock-ops";
import { expireOrders } from "./expiry";
import { log, notifyOrder } from "./notify";

export interface OrderListFilters {
  status?: OrderStatus | OrderStatus[];
  /** order no / customer name / WA (substring, case-insensitive) */
  q?: string;
  page?: number;
  pageSize?: number;
}

export interface OrderAdminRow {
  orderNo: string;
  status: OrderStatus;
  customerName: string;
  customerWa: string;
  totalIdr: number;
  itemCount: number;
  hasPreorder: boolean;
  paymentMethod: PaymentMethod | null;
  paymentChannel: PaymentChannel | null;
  courier: string;
  service: string;
  createdAt: Date;
  paidAt: Date | null;
}

export async function listOrders(filters: OrderListFilters = {}): Promise<{ items: OrderAdminRow[]; total: number; page: number; pageSize: number }> {
  await expireOrders();
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(Math.max(filters.pageSize ?? 25, 1), 200);
  const conds: SQL[] = [];
  const statuses = filters.status ? (Array.isArray(filters.status) ? filters.status : [filters.status]) : [];
  if (statuses.length) conds.push(inArray(orders.status, statuses));
  if (filters.q?.trim()) {
    const q = `%${filters.q.trim()}%`;
    conds.push(or(ilike(orders.orderNo, q), ilike(orders.customerName, q), ilike(orders.customerWa, q))!);
  }
  const where = conds.length ? and(...conds) : undefined;
  const [{ total }] = await db.select({ total: count() }).from(orders).where(where);
  const rows = await db
    .select()
    .from(orders)
    .where(where)
    .orderBy(desc(orders.createdAt))
    .limit(pageSize)
    .offset((page - 1) * pageSize);
  const ids = rows.map((r) => r.id);
  const [itemCounts, pays] = ids.length
    ? await Promise.all([
        db
          .select({ orderId: orderItems.orderId, n: sql<number>`sum(${orderItems.qty})::int` })
          .from(orderItems)
          .where(inArray(orderItems.orderId, ids))
          .groupBy(orderItems.orderId),
        db.select().from(payments).where(inArray(payments.orderId, ids)).orderBy(desc(payments.createdAt)),
      ])
    : [[], []];
  const countMap = new Map(itemCounts.map((c) => [c.orderId, c.n]));
  const payMap = new Map<string, (typeof pays)[number]>();
  for (const p of pays) if (!payMap.has(p.orderId)) payMap.set(p.orderId, p);
  return {
    items: rows.map((o) => {
      const p = payMap.get(o.id);
      return {
        orderNo: o.orderNo,
        status: o.status as OrderStatus,
        customerName: o.customerName,
        customerWa: o.customerWa,
        totalIdr: o.totalIdr,
        itemCount: countMap.get(o.id) ?? 0,
        hasPreorder: o.hasPreorder,
        paymentMethod: (p?.method ?? null) as PaymentMethod | null,
        paymentChannel: (p?.channel ?? null) as PaymentChannel | null,
        courier: o.shipping.courier,
        service: o.shipping.service,
        createdAt: o.createdAt,
        paidAt: o.paidAt,
      };
    }),
    total,
    page,
    pageSize,
  };
}

export interface OrderAdminView extends OrderPublicView {
  customerWa: string;
  customerEmail: string | null;
  waOptIn: boolean;
  voucherCode: string | null;
  fromCheckoutLink: boolean;
  items: (OrderPublicView["items"][number] & { sku: string })[];
  payments: {
    provider: string; method: PaymentMethod; channel: PaymentChannel | null; status: string; amountIdr: number;
    providerRef: string; vaNumber: string | null; expiresAt: Date; paidAt: Date | null; createdAt: Date;
  }[];
  reservations: { sku: string; qty: number; expiresAt: Date; releasedAt: Date | null; consumedAt: Date | null }[];
  messages: { template: string; body: string; status: string; createdAt: Date }[];
  /** transitions the admin UI may offer (system-only PAID/EXPIRED excluded) */
  allowedTransitions: OrderStatus[];
}

/** System-driven transitions an admin cannot trigger by hand. */
const SYSTEM_ONLY: OrderStatus[] = ["PAID", "EXPIRED"];

export function adminTransitionsFor(status: OrderStatus): OrderStatus[] {
  return ORDER_TRANSITIONS[status].filter((s) => !SYSTEM_ONLY.includes(s));
}

export async function getOrderAdmin(orderNo: string): Promise<OrderAdminView | null> {
  await expireOrders(new Date(), { orderNo: orderNo.trim().toUpperCase() });
  const b = await loadOrderBundle(orderNo);
  if (!b) return null;
  const base = buildOrderView(b);
  const [res, msgs] = await Promise.all([
    db.select().from(stockReservations).where(eq(stockReservations.orderId, b.order.id)).orderBy(asc(stockReservations.sku)),
    db.select().from(waOutbox).where(eq(waOutbox.orderId, b.order.id)).orderBy(asc(waOutbox.createdAt)),
  ]);
  return {
    ...base,
    items: base.items.map((it, i) => ({ ...it, sku: b.items[i].sku })),
    customerWa: b.order.customerWa,
    customerEmail: b.order.customerEmail,
    waOptIn: b.order.waOptIn,
    voucherCode: b.order.voucherCode,
    fromCheckoutLink: !!b.order.checkoutLinkId,
    payments: b.payments.map((p) => ({
      provider: p.provider, method: p.method as PaymentMethod, channel: (p.channel ?? null) as PaymentChannel | null,
      status: p.status, amountIdr: p.amountIdr, providerRef: p.providerRef, vaNumber: p.vaNumber,
      expiresAt: p.expiresAt, paidAt: p.paidAt, createdAt: p.createdAt,
    })),
    reservations: res.map((r) => ({ sku: r.sku, qty: r.qty, expiresAt: r.expiresAt, releasedAt: r.releasedAt, consumedAt: r.consumedAt })),
    messages: msgs.map((m) => ({ template: m.template, body: m.body, status: m.status, createdAt: m.createdAt })),
    allowedTransitions: adminTransitionsFor(base.status),
  };
}

export type TransitionResult =
  | { ok: true; orderNo: string; status: OrderStatus }
  | { ok: false; error: "NOT_FOUND" | "INVALID_TRANSITION" | "TRACKING_REQUIRED" };

/**
 * ADM-04 state machine (docs/05 §3), enforced server-side:
 * PAID→PROCESSING, PROCESSING→SHIPPED (courier + awb, ORDER_SHIPPED), SHIPPED→DELIVERED (ORDER_DELIVERED),
 * PENDING_PAYMENT→CANCELLED (releases reservations, cancels payment),
 * PAID/PROCESSING→REFUND_PENDING (stock returned to on_hand, movement order_cancel), REFUND_PENDING→CANCELLED.
 * PAID / EXPIRED are system-only (webhook / expiry) → INVALID_TRANSITION here.
 */
export async function transitionOrder(
  orderNo: string,
  to: OrderStatus,
  opts: { courier?: string; awb?: string; actor?: string; now?: Date } = {},
): Promise<TransitionResult> {
  const now = opts.now ?? new Date();
  const actor = opts.actor ?? "admin";
  const no = orderNo.trim().toUpperCase();
  if (SYSTEM_ONLY.includes(to)) return { ok: false, error: "INVALID_TRANSITION" };
  if (to === "SHIPPED" && (!opts.courier?.trim() || !opts.awb?.trim())) return { ok: false, error: "TRACKING_REQUIRED" };

  const restocked: string[] = [];
  const res = await db.transaction(async (tx) => {
    const [o] = await tx.select().from(orders).where(eq(orders.orderNo, no)).for("update");
    if (!o) return { ok: false as const, error: "NOT_FOUND" as const };
    const from = o.status as OrderStatus;
    if (!canTransition(from, to)) return { ok: false as const, error: "INVALID_TRANSITION" as const };
    const patch: Partial<typeof orders.$inferInsert> = { status: to, updatedAt: now };
    let cancelRefs: string[] = [];
    switch (to) {
      case "PROCESSING":
        patch.processingAt = now;
        break;
      case "SHIPPED":
        patch.shippedAt = now;
        patch.tracking = { courier: opts.courier!.trim(), awb: opts.awb!.trim(), shippedAt: now.toISOString(), deliveredAt: null };
        break;
      case "DELIVERED":
        patch.deliveredAt = now;
        patch.tracking = { ...(o.tracking ?? { courier: o.shipping.courier, awb: "", shippedAt: null }), deliveredAt: now.toISOString() };
        break;
      case "CANCELLED":
        patch.cancelledAt = now;
        if (from === "PENDING_PAYMENT") {
          await releaseReservations(tx, o.id, now);
          const cancelled = await tx
            .update(payments)
            .set({ status: "CANCELLED" })
            .where(and(eq(payments.orderId, o.id), eq(payments.status, "PENDING")))
            .returning({ ref: payments.providerRef });
          cancelRefs = cancelled.map((c) => c.ref);
        }
        break;
      case "REFUND_PENDING": {
        // goods never left the warehouse → return consumed (non-preorder) stock
        const consumed = await tx
          .select()
          .from(stockReservations)
          .where(and(eq(stockReservations.orderId, o.id), sql`${stockReservations.consumedAt} is not null`));
        for (const r of consumed) {
          const [before] = await tx.select().from(variants).where(eq(variants.sku, r.sku)).for("update");
          await tx.update(variants).set({ onHand: sql`${variants.onHand} + ${r.qty}`, updatedAt: now }).where(eq(variants.sku, r.sku));
          await tx.insert(stockMovements).values({ sku: r.sku, delta: r.qty, reason: "order_cancel", ref: o.orderNo, actor, createdAt: now });
          if (before && before.onHand - before.reserved <= 0) restocked.push(r.sku);
        }
        break;
      }
    }
    const [updated] = await tx.update(orders).set(patch).where(eq(orders.id, o.id)).returning();
    return { ok: true as const, order: updated, cancelRefs };
  });
  if (!res.ok) return res;

  for (const ref of res.cancelRefs) {
    try {
      await getPaymentProvider().cancelPayment(ref);
    } catch (err) {
      console.error(JSON.stringify({ event: "payment.cancel_failed", ref, error: String(err) }));
    }
  }
  const o = { ...res.order, locale: res.order.locale as Locale };
  if (to === "SHIPPED") await notifyOrder(o, "ORDER_SHIPPED", null, { courier: opts.courier!.trim(), awb: opts.awb!.trim() });
  if (to === "DELIVERED") await notifyOrder(o, "ORDER_DELIVERED");
  if (restocked.length) await notifyBackInStock(restocked);
  log("order.transition", { orderNo: no, to, actor });
  return { ok: true, orderNo: no, status: to };
}

export interface DashboardStats {
  ordersToday: number;
  revenueTodayIdr: number;
  pendingPayment: number;
  toShip: number; // PAID + PROCESSING
  shipped: number;
  lowStockVariants: number; // 1..LOW_STOCK_THRESHOLD available
  soldOutVariants: number;
  pendingBackInStock: number;
  recentOrders: OrderAdminRow[];
}

/** ADM-02 */
export async function getDashboardStats(now: Date = new Date()): Promise<DashboardStats> {
  await expireOrders(now);
  const todayStart = new Date(startOfDay(new TZDate(now, TZ)).getTime());
  const avail = sql`${variants.onHand} - ${variants.reserved}`;
  const [[today], [revenue], byStatus, [low], [soldOut], [bis], recent] = await Promise.all([
    db.select({ n: count() }).from(orders).where(gte(orders.createdAt, todayStart)),
    db
      .select({ sum: sql<number>`coalesce(sum(${orders.totalIdr}), 0)::int` })
      .from(orders)
      .where(and(gte(orders.paidAt, todayStart), inArray(orders.status, ["PAID", "PROCESSING", "SHIPPED", "DELIVERED"]))),
    db.select({ status: orders.status, n: count() }).from(orders).groupBy(orders.status),
    db.select({ n: count() }).from(variants).where(sql`${avail} > 0 and ${avail} <= ${LOW_STOCK_THRESHOLD}`),
    db.select({ n: count() }).from(variants).where(sql`${avail} <= 0 and not ${variants.preorderEnabled}`),
    db.select({ n: count() }).from(backInStockRequests).where(isNull(backInStockRequests.notifiedAt)),
    listOrders({ pageSize: 5 }),
  ]);
  const st = new Map(byStatus.map((r) => [r.status, r.n]));
  return {
    ordersToday: today.n,
    revenueTodayIdr: revenue.sum,
    pendingPayment: st.get("PENDING_PAYMENT") ?? 0,
    toShip: (st.get("PAID") ?? 0) + (st.get("PROCESSING") ?? 0),
    shipped: st.get("SHIPPED") ?? 0,
    lowStockVariants: low.n,
    soldOutVariants: soldOut.n,
    pendingBackInStock: bis.n,
    recentOrders: recent.items,
  };
}
