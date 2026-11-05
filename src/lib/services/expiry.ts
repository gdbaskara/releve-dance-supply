/** Order expiry (STK-03): release reservations of unpaid orders past payment expiry + grace. Server-only. */
import { and, eq, lt, sql } from "drizzle-orm";
import { db } from "@/db";
import { orders, payments } from "@/db/schema";
import { RESERVATION_GRACE_MINUTES, type Locale } from "@/lib/contracts";
import { releaseReservations } from "./stock-ops";
import { log, notifyOrder } from "./notify";

export interface ExpireResult { expired: string[] }

/** Expire one order inside its own transaction. Returns true if it transitioned. Caller sends messages. */
export async function expireOrderById(orderId: string, now: Date): Promise<typeof orders.$inferSelect | null> {
  return db.transaction(async (tx) => {
    const [o] = await tx.select().from(orders).where(eq(orders.id, orderId)).for("update");
    if (!o || o.status !== "PENDING_PAYMENT") return null;
    await releaseReservations(tx, o.id, now);
    await tx.update(payments).set({ status: "EXPIRED" }).where(and(eq(payments.orderId, o.id), eq(payments.status, "PENDING")));
    const [updated] = await tx.update(orders).set({ status: "EXPIRED", updatedAt: now }).where(eq(orders.id, o.id)).returning();
    return updated;
  });
}

/**
 * Expire all PENDING_PAYMENT orders whose expires_at + RESERVATION_GRACE_MINUTES < now
 * (or a single order when orderNo is given). Sends PAYMENT_EXPIRED (opt-in) per order.
 */
export async function expireOrders(now: Date = new Date(), opts: { orderNo?: string } = {}): Promise<ExpireResult> {
  const cutoff = new Date(now.getTime() - RESERVATION_GRACE_MINUTES * 60_000);
  const conds = [eq(orders.status, "PENDING_PAYMENT"), lt(orders.expiresAt, cutoff)];
  if (opts.orderNo) conds.push(eq(orders.orderNo, opts.orderNo));
  const due = await db.select({ id: orders.id }).from(orders).where(and(...conds));
  const expired: string[] = [];
  for (const { id } of due) {
    const o = await expireOrderById(id, now);
    if (!o) continue;
    expired.push(o.orderNo);
    log("order.expired", { orderNo: o.orderNo });
    await notifyOrder({ ...o, locale: o.locale as Locale }, "PAYMENT_EXPIRED");
  }
  return { expired };
}

let lastSweep = 0;
/** Throttled global sweep (≤ once per 30 s per process) so stock stays honest even without the cron. */
export async function maybeSweepExpiredOrders(now: Date = new Date()): Promise<void> {
  if (now.getTime() - lastSweep < 30_000) return;
  lastSweep = now.getTime();
  try {
    const [{ n }] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(orders)
      .where(and(eq(orders.status, "PENDING_PAYMENT"), lt(orders.expiresAt, new Date(now.getTime() - RESERVATION_GRACE_MINUTES * 60_000))));
    if (n > 0) await expireOrders(now);
  } catch (err) {
    console.error(JSON.stringify({ event: "expiry.sweep_failed", error: String(err) }));
  }
}

/** Test helper */
export function __resetSweepThrottle(): void {
  lastSweep = 0;
}
