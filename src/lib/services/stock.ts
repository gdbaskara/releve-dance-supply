/** Stock admin & back-in-stock (STK-01/02/07/08, ADM-03). Server-only. */
import { and, asc, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { backInStockRequests, products, stockMovements, variants } from "@/db/schema";
import {
  LOW_STOCK_THRESHOLD,
  deriveStockStatus,
  type Audience,
  type Discipline,
  type Locale,
  type StockStatus,
} from "@/lib/contracts";
import { normalizePhoneID } from "@/lib/format/phone";
import { notifyBackInStock } from "./stock-ops";
import { variantLabel } from "./labels";
import { log } from "./notify";

export interface VariantAdminView {
  sku: string;
  productId: string;
  color: string | null;
  size: string | null;
  width: string | null;
  shank: string | null;
  label: string;
  onHand: number;
  reserved: number;
  available: number;
  status: StockStatus;
  preorderEnabled: boolean;
  preorderLeadWeeks: string | null;
  weightGrams: number;
}

function toAdminView(v: typeof variants.$inferSelect): VariantAdminView {
  const available = v.onHand - v.reserved;
  return {
    sku: v.sku, productId: v.productId, color: v.color, size: v.size, width: v.width, shank: v.shank,
    label: variantLabel(v), onHand: v.onHand, reserved: v.reserved, available,
    status: deriveStockStatus(available, v.preorderEnabled),
    preorderEnabled: v.preorderEnabled, preorderLeadWeeks: v.preorderLeadWeeks, weightGrams: v.weightGrams,
  };
}

export type AdjustStockResult =
  | { ok: true; variant: VariantAdminView; delta: number; notified: number }
  | { ok: false; error: "NOT_FOUND" | "INVALID_QTY" | "BELOW_RESERVED"; reserved?: number };

/**
 * ADM-03: set on_hand to an absolute value. Rejects < reserved. Writes a stock_movement.
 * If available goes 0 → > 0, pending back-in-stock requests get a BACK_IN_STOCK message (STK-07).
 */
export async function adjustStock(
  sku: string,
  newOnHand: number,
  actor: string,
  reason: "admin_adjust" | "restock" = "admin_adjust",
): Promise<AdjustStockResult> {
  if (!Number.isInteger(newOnHand) || newOnHand < 0 || newOnHand > 100_000) return { ok: false, error: "INVALID_QTY" };
  const now = new Date();
  const res = await db.transaction(async (tx) => {
    const [v] = await tx.select().from(variants).where(eq(variants.sku, sku)).for("update");
    if (!v) return { ok: false as const, error: "NOT_FOUND" as const };
    if (newOnHand < v.reserved) return { ok: false as const, error: "BELOW_RESERVED" as const, reserved: v.reserved };
    const delta = newOnHand - v.onHand;
    const [updated] = await tx.update(variants).set({ onHand: newOnHand, updatedAt: now }).where(eq(variants.sku, sku)).returning();
    if (delta !== 0) await tx.insert(stockMovements).values({ sku, delta, reason, actor, createdAt: now });
    return { ok: true as const, before: v, after: updated, delta };
  });
  if (!res.ok) return res;
  const wasOut = res.before.onHand - res.before.reserved <= 0;
  const nowIn = res.after.onHand - res.after.reserved > 0;
  const notified = wasOut && nowIn ? await notifyBackInStock([sku]) : 0;
  log("stock.adjusted", { sku, delta: res.delta, actor, notified });
  return { ok: true, variant: toAdminView(res.after), delta: res.delta, notified };
}

export type PreorderTarget = { sku: string } | { productId: string };

/** Toggle pre-order for one variant or every variant of a product. lead e.g. "4-6" (weeks). */
export async function setPreorder(target: PreorderTarget, enabled: boolean, lead: string | null = "4-6"): Promise<{ ok: true; updated: number } | { ok: false; error: "NOT_FOUND" | "INVALID_LEAD" }> {
  const leadValue = enabled ? (lead?.trim() || "4-6") : null;
  if (leadValue && !/^\d{1,2}(-\d{1,2})?$/.test(leadValue)) return { ok: false, error: "INVALID_LEAD" };
  const where = "sku" in target ? eq(variants.sku, target.sku) : eq(variants.productId, target.productId);
  const rows = await db
    .update(variants)
    .set({ preorderEnabled: enabled, preorderLeadWeeks: leadValue, updatedAt: new Date() })
    .where(where)
    .returning({ sku: variants.sku });
  if (rows.length === 0) return { ok: false, error: "NOT_FOUND" };
  return { ok: true, updated: rows.length };
}

export type BackInStockResult = { ok: true; alreadyRequested: boolean } | { ok: false; error: "INVALID_WA" | "NOT_FOUND" };

/** STK-07: store WA + variant; deduplicated per (sku, wa) while pending. */
export async function requestBackInStock(sku: string, wa: string, locale: Locale): Promise<BackInStockResult> {
  const e164 = normalizePhoneID(wa);
  if (!e164) return { ok: false, error: "INVALID_WA" };
  const [v] = await db.select({ sku: variants.sku }).from(variants).where(eq(variants.sku, sku)).limit(1);
  if (!v) return { ok: false, error: "NOT_FOUND" };
  const [existing] = await db
    .select({ id: backInStockRequests.id })
    .from(backInStockRequests)
    .where(and(eq(backInStockRequests.sku, sku), eq(backInStockRequests.customerWa, e164), isNull(backInStockRequests.notifiedAt)))
    .limit(1);
  if (existing) return { ok: true, alreadyRequested: true };
  await db.insert(backInStockRequests).values({ sku, customerWa: e164, locale });
  return { ok: true, alreadyRequested: false };
}

export interface BackInStockRow {
  id: string;
  sku: string;
  productId: string;
  productName: string;
  modelCode: string;
  variantLabel: string;
  customerWa: string;
  locale: Locale;
  available: number;
  createdAt: Date;
  notifiedAt: Date | null;
}

export async function listBackInStock(opts: { pendingOnly?: boolean } = {}): Promise<BackInStockRow[]> {
  const rows = await db
    .select({ r: backInStockRequests, v: variants, p: { id: products.id, name: products.name, modelCode: products.modelCode } })
    .from(backInStockRequests)
    .innerJoin(variants, eq(variants.sku, backInStockRequests.sku))
    .innerJoin(products, eq(products.id, variants.productId))
    .where(opts.pendingOnly ? isNull(backInStockRequests.notifiedAt) : undefined)
    .orderBy(desc(backInStockRequests.createdAt));
  return rows.map(({ r, v, p }) => ({
    id: r.id, sku: r.sku, productId: p.id, productName: p.name, modelCode: p.modelCode, variantLabel: variantLabel(v),
    customerWa: r.customerWa, locale: r.locale as Locale, available: v.onHand - v.reserved, createdAt: r.createdAt, notifiedAt: r.notifiedAt,
  }));
}

export interface LowStockRow extends VariantAdminView { productName: string; modelCode: string }

/** Variants with 1..threshold available (status LOW), lowest first. */
export async function listLowStock(opts: { threshold?: number; limit?: number } = {}): Promise<LowStockRow[]> {
  const threshold = opts.threshold ?? LOW_STOCK_THRESHOLD;
  const avail = sql`${variants.onHand} - ${variants.reserved}`;
  const rows = await db
    .select({ v: variants, name: products.name, modelCode: products.modelCode })
    .from(variants)
    .innerJoin(products, eq(products.id, variants.productId))
    .where(sql`${avail} > 0 and ${avail} <= ${threshold}`)
    .orderBy(asc(avail), asc(products.sortOrder), asc(variants.sortOrder))
    .limit(opts.limit ?? 200);
  return rows.map(({ v, name, modelCode }) => ({ ...toAdminView(v), productName: name, modelCode }));
}

export interface ProductAdminRow {
  id: string;
  name: string;
  modelCode: string;
  discipline: Discipline;
  audience: Audience;
  priceIdr: number;
  isActive: boolean;
  variantCount: number;
  onHand: number;
  reserved: number;
  statusCounts: Record<StockStatus, number>;
}

/** ADM-03 product table */
export async function listProductsAdmin(): Promise<ProductAdminRow[]> {
  const [ps, vs] = await Promise.all([
    db.select().from(products).orderBy(asc(products.sortOrder)),
    db.select().from(variants),
  ]);
  const agg = new Map<string, ProductAdminRow>();
  for (const p of ps) {
    agg.set(p.id, {
      id: p.id, name: p.name, modelCode: p.modelCode, discipline: p.discipline as Discipline, audience: p.audience as Audience,
      priceIdr: p.priceIdr, isActive: p.isActive, variantCount: 0, onHand: 0, reserved: 0,
      statusCounts: { READY: 0, LOW: 0, PREORDER: 0, SOLD_OUT: 0 },
    });
  }
  for (const v of vs) {
    const a = agg.get(v.productId);
    if (!a) continue;
    a.variantCount++;
    a.onHand += v.onHand;
    a.reserved += v.reserved;
    a.statusCounts[deriveStockStatus(v.onHand - v.reserved, v.preorderEnabled)]++;
  }
  return [...agg.values()];
}

export interface ProductAdminDetail {
  id: string;
  name: string;
  modelCode: string;
  discipline: Discipline;
  audience: Audience;
  priceIdr: number;
  landedCostIdr: number;
  msrpUsd: number;
  options: string[];
  colors: string[];
  widths: string[];
  variants: VariantAdminView[];
}

/** ADM-03 variant grid (size × width per color) — also used by the checkout-link builder. */
export async function getProductAdmin(id: string): Promise<ProductAdminDetail | null> {
  const [p] = await db.select().from(products).where(eq(products.id, id)).limit(1);
  if (!p) return null;
  const vs = await db.select().from(variants).where(eq(variants.productId, id)).orderBy(asc(variants.sortOrder));
  return {
    id: p.id, name: p.name, modelCode: p.modelCode, discipline: p.discipline as Discipline, audience: p.audience as Audience,
    priceIdr: p.priceIdr, landedCostIdr: p.landedCostIdr, msrpUsd: Number(p.msrpUsd),
    options: p.options, colors: p.colors, widths: p.widths, variants: vs.map(toAdminView),
  };
}

/** Recent stock movements (optionally for some SKUs) — audit trail STK-08. */
export async function listStockMovements(opts: { skus?: string[]; limit?: number } = {}) {
  return db
    .select()
    .from(stockMovements)
    .where(opts.skus?.length ? inArray(stockMovements.sku, opts.skus) : undefined)
    .orderBy(desc(stockMovements.createdAt))
    .limit(opts.limit ?? 100);
}
