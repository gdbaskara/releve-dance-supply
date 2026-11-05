/**
 * Payment webhooks (PAY-07/08). Idempotent via payment_events.event_id. Server-only.
 * Lock order: orders → payments → variants (same as expiry / admin transitions) to avoid deadlocks.
 */
import { and, desc, eq, ne } from "drizzle-orm";
import { db } from "@/db";
import { orders, paymentEvents, payments } from "@/db/schema";
import type { Locale, OrderStatus, PaymentWebhookResult } from "@/lib/contracts";
import { getPaymentProvider } from "@/lib/providers";
import { buildMockWebhookRequest } from "@/lib/providers/payment/mock";
import { consumeReservations, releaseReservations } from "./stock-ops";
import { log, notifyOrder } from "./notify";

export type WebhookOutcome =
  | { ok: true; duplicate: boolean; orderNo?: string; orderStatus?: OrderStatus; ignored?: "ALREADY_PROCESSED" | "ORDER_NOT_PENDING" | "NOT_CURRENT_PAYMENT" }
  | { ok: false; error: "INVALID_SIGNATURE" | "UNKNOWN_PAYMENT" };

class UnknownPaymentError extends Error {}

/** Verify (provider) + process. Used by POST /api/webhooks/payment and the demo simulator. */
export async function handlePaymentWebhook(req: Request): Promise<WebhookOutcome> {
  const provider = getPaymentProvider();
  let event: PaymentWebhookResult;
  try {
    event = await provider.verifyAndParseWebhook(req);
  } catch (err) {
    log("payment.webhook_rejected", { error: String(err) });
    return { ok: false, error: "INVALID_SIGNATURE" };
  }
  return processPaymentEvent(provider.name, event);
}

type Pending = { template: "PAYMENT_PAID" | "PAYMENT_EXPIRED"; order: typeof orders.$inferSelect; payment: typeof payments.$inferSelect } | null;

export async function processPaymentEvent(providerName: string, ev: PaymentWebhookResult, now: Date = new Date()): Promise<WebhookOutcome> {
  let message: Pending = null;
  let outcome: WebhookOutcome;
  try {
    outcome = await db.transaction(async (tx) => {
      const inserted = await tx
        .insert(paymentEvents)
        .values({ provider: providerName, eventId: ev.eventId, payload: ev.raw as object, processedAt: now })
        .onConflictDoNothing({ target: paymentEvents.eventId })
        .returning({ id: paymentEvents.id });
      if (inserted.length === 0) return { ok: true as const, duplicate: true };

      const [ref] = await tx
        .select({ orderId: payments.orderId })
        .from(payments)
        .where(and(eq(payments.provider, providerName), eq(payments.providerRef, ev.providerRef)))
        .limit(1);
      if (!ref) throw new UnknownPaymentError();
      const [o] = await tx.select().from(orders).where(eq(orders.id, ref.orderId)).for("update");
      const [p] = await tx
        .select()
        .from(payments)
        .where(and(eq(payments.provider, providerName), eq(payments.providerRef, ev.providerRef)))
        .for("update");
      const base = { ok: true as const, duplicate: false, orderNo: o.orderNo };

      if (ev.status === "PAID") {
        if (p.status === "PAID") return { ...base, orderStatus: o.status as OrderStatus, ignored: "ALREADY_PROCESSED" as const };
        const paidAt = ev.paidAt ?? now;
        await tx.update(payments).set({ status: "PAID", paidAt, raw: ev.raw as object }).where(eq(payments.id, p.id));
        if (o.status !== "PENDING_PAYMENT") {
          log("payment.paid_order_not_pending", { orderNo: o.orderNo, status: o.status });
          return { ...base, orderStatus: o.status as OrderStatus, ignored: "ORDER_NOT_PENDING" as const };
        }
        await consumeReservations(tx, o.id, o.orderNo, now);
        await tx
          .update(payments)
          .set({ status: "CANCELLED" })
          .where(and(eq(payments.orderId, o.id), eq(payments.status, "PENDING"), ne(payments.id, p.id)));
        const [updated] = await tx.update(orders).set({ status: "PAID", paidAt, updatedAt: now }).where(eq(orders.id, o.id)).returning();
        message = { template: "PAYMENT_PAID", order: updated, payment: p };
        return { ...base, orderStatus: "PAID" as const };
      }

      if (p.status !== "PENDING") return { ...base, orderStatus: o.status as OrderStatus, ignored: "ALREADY_PROCESSED" as const };
      await tx.update(payments).set({ status: ev.status, raw: ev.raw as object }).where(eq(payments.id, p.id));

      if (ev.status === "EXPIRED" && o.status === "PENDING_PAYMENT") {
        // only expire the order if this was its current payment (not an old, replaced one)
        const [latest] = await tx.select().from(payments).where(eq(payments.orderId, o.id)).orderBy(desc(payments.createdAt)).limit(1);
        if (latest && latest.id !== p.id) return { ...base, orderStatus: o.status as OrderStatus, ignored: "NOT_CURRENT_PAYMENT" as const };
        await releaseReservations(tx, o.id, now);
        const [updated] = await tx.update(orders).set({ status: "EXPIRED", updatedAt: now }).where(eq(orders.id, o.id)).returning();
        message = { template: "PAYMENT_EXPIRED", order: updated, payment: p };
        return { ...base, orderStatus: "EXPIRED" as const };
      }
      return { ...base, orderStatus: o.status as OrderStatus };
    });
  } catch (err) {
    if (err instanceof UnknownPaymentError) return { ok: false, error: "UNKNOWN_PAYMENT" };
    throw err;
  }
  log("payment.webhook", { eventId: ev.eventId, status: ev.status, outcome });
  const m = message as Pending;
  if (m) await notifyOrder({ ...m.order, locale: m.order.locale as Locale }, m.template, m.payment);
  return outcome;
}

// Demo simulation (PAY-05/07): same signed webhook path as production

export type SimulateResult = WebhookOutcome | { ok: false; error: "NOT_FOUND" | "NO_PENDING_PAYMENT" | "NOT_MOCK" };

export async function simulatePayment(orderNo: string, outcome: "PAID" | "EXPIRED" | "FAILED"): Promise<SimulateResult> {
  const provider = getPaymentProvider();
  if (provider.name !== "mock") return { ok: false, error: "NOT_MOCK" };
  const [o] = await db.select().from(orders).where(eq(orders.orderNo, orderNo.trim().toUpperCase())).limit(1);
  if (!o) return { ok: false, error: "NOT_FOUND" };
  const [p] = await db
    .select()
    .from(payments)
    .where(and(eq(payments.orderId, o.id), eq(payments.status, "PENDING")))
    .orderBy(desc(payments.createdAt))
    .limit(1);
  if (!p) return { ok: false, error: "NO_PENDING_PAYMENT" };
  const req = buildMockWebhookRequest({
    provider_ref: p.providerRef,
    status: outcome,
    paid_at: outcome === "PAID" ? new Date().toISOString() : undefined,
  });
  return handlePaymentWebhook(req);
}

/** PAY-05 mock card: 4000 0000 0000 0002 fails, any other number succeeds. Card data is never stored. */
export const MOCK_FAILING_CARD = "4000000000000002";
export async function simulateCardPayment(orderNo: string, cardNumber: string): Promise<SimulateResult> {
  const digits = cardNumber.replace(/\D/g, "");
  return simulatePayment(orderNo, digits === MOCK_FAILING_CARD ? "FAILED" : "PAID");
}
