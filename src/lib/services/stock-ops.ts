/** Low-level stock operations used inside transactions (STK-03/04/07/08). Server-only. */
import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { backInStockRequests, products, stockMovements, stockReservations, variants } from "@/db/schema";
import type { Locale } from "@/lib/contracts";
import type { DbOrTx, Tx } from "./db-types";
import { urls, sendMessage } from "./notify";
import { variantLabel } from "./labels";

/** Release every active reservation of an order: reserved -= qty, released_at = now. Returns released SKUs. */
export async function releaseReservations(tx: Tx, orderId: string, now: Date): Promise<string[]> {
  const active = await tx
    .select()
    .from(stockReservations)
    .where(and(eq(stockReservations.orderId, orderId), isNull(stockReservations.releasedAt), isNull(stockReservations.consumedAt)))
    .orderBy(stockReservations.sku);
  for (const r of active) {
    await tx.update(variants)
      .set({ reserved: sql`${variants.reserved} - ${r.qty}`, updatedAt: now })
      .where(eq(variants.sku, r.sku));
    await tx.update(stockReservations).set({ releasedAt: now }).where(eq(stockReservations.id, r.id));
  }
  return active.map((r) => r.sku);
}

/** Consume reservations on payment: on_hand -= qty, reserved -= qty, movement order_paid. */
export async function consumeReservations(tx: Tx, orderId: string, orderNo: string, now: Date): Promise<number> {
  const active = await tx
    .select()
    .from(stockReservations)
    .where(and(eq(stockReservations.orderId, orderId), isNull(stockReservations.releasedAt), isNull(stockReservations.consumedAt)))
    .orderBy(stockReservations.sku);
  for (const r of active) {
    await tx.update(variants)
      .set({ onHand: sql`${variants.onHand} - ${r.qty}`, reserved: sql`${variants.reserved} - ${r.qty}`, updatedAt: now })
      .where(eq(variants.sku, r.sku));
    await tx.update(stockReservations).set({ consumedAt: now }).where(eq(stockReservations.id, r.id));
    await tx.insert(stockMovements).values({ sku: r.sku, delta: -r.qty, reason: "order_paid", ref: orderNo, actor: "system", createdAt: now });
  }
  return active.length;
}

/**
 * Notify pending back-in-stock requests for SKUs whose available stock is now > 0 (STK-07).
 * Run AFTER the stock change committed. Returns number of messages sent.
 */
export async function notifyBackInStock(skus: string[], conn: DbOrTx = db): Promise<number> {
  if (skus.length === 0) return 0;
  const rows = await conn
    .select({
      id: backInStockRequests.id,
      sku: backInStockRequests.sku,
      wa: backInStockRequests.customerWa,
      locale: backInStockRequests.locale,
      onHand: variants.onHand,
      reserved: variants.reserved,
      color: variants.color,
      size: variants.size,
      width: variants.width,
      shank: variants.shank,
      productId: products.id,
      name: products.name,
    })
    .from(backInStockRequests)
    .innerJoin(variants, eq(variants.sku, backInStockRequests.sku))
    .innerJoin(products, eq(products.id, variants.productId))
    .where(and(inArray(backInStockRequests.sku, skus), isNull(backInStockRequests.notifiedAt)));
  let sent = 0;
  for (const r of rows) {
    if (r.onHand - r.reserved <= 0) continue;
    // claim the request first so concurrent restocks don't double-send
    const claimed = await conn
      .update(backInStockRequests)
      .set({ notifiedAt: new Date() })
      .where(and(eq(backInStockRequests.id, r.id), isNull(backInStockRequests.notifiedAt)))
      .returning({ id: backInStockRequests.id });
    if (claimed.length === 0) continue;
    const locale = r.locale as Locale;
    const ok = await sendMessage(r.wa, "BACK_IN_STOCK", locale, {
      name: r.name,
      variant: variantLabel(r),
      url: urls.product(locale, r.productId),
    });
    if (ok) sent++;
  }
  return sent;
}
