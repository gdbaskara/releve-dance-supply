/** Cart validation (CART-02/03). Server-only — prices & stock always from the DB. */
import { eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { products, variants } from "@/db/schema";
import {
  PREORDER_MAX_QTY,
  deriveStockStatus,
  type CartItemInput,
  type CartLineView,
  type CartNotice,
  type ProductImage,
  type StockStatus,
  type ValidatedCart,
} from "@/lib/contracts";
import type { DbOrTx } from "./db-types";
import { variantLabel } from "./labels";
import { maybeSweepExpiredOrders } from "./expiry";

export interface CartValidateItem extends CartItemInput {
  /** what the client currently believes; lets us emit NOW_PREORDER when a ready line became pre-order */
  isPreorder?: boolean;
}

export interface VariantWithProduct {
  sku: string;
  productId: string;
  color: string | null;
  size: string | null;
  width: string | null;
  shank: string | null;
  weightGrams: number;
  onHand: number;
  reserved: number;
  preorderEnabled: boolean;
  preorderLeadWeeks: string | null;
  name: string;
  modelCode: string;
  priceIdr: number;
  images: ProductImage[];
  isActive: boolean;
}

export async function loadVariants(skus: string[], conn: DbOrTx = db): Promise<Map<string, VariantWithProduct>> {
  if (skus.length === 0) return new Map();
  const rows = await conn
    .select({
      sku: variants.sku,
      productId: variants.productId,
      color: variants.color,
      size: variants.size,
      width: variants.width,
      shank: variants.shank,
      weightGrams: variants.weightGrams,
      onHand: variants.onHand,
      reserved: variants.reserved,
      preorderEnabled: variants.preorderEnabled,
      preorderLeadWeeks: variants.preorderLeadWeeks,
      name: products.name,
      modelCode: products.modelCode,
      priceIdr: products.priceIdr,
      images: products.images,
      isActive: products.isActive,
    })
    .from(variants)
    .innerJoin(products, eq(products.id, variants.productId))
    .where(inArray(variants.sku, skus));
  return new Map(rows.map((r) => [r.sku, { ...r, images: (r.images ?? []) as ProductImage[] }]));
}

/** Merge duplicate SKUs (sum qty), keep first-seen order. */
export function mergeItems<T extends CartItemInput>(items: T[]): T[] {
  const map = new Map<string, T>();
  for (const it of items) {
    const prev = map.get(it.sku);
    if (prev) map.set(it.sku, { ...prev, qty: prev.qty + it.qty });
    else map.set(it.sku, { ...it });
  }
  return [...map.values()];
}

export function lineFor(v: VariantWithProduct, qty: number): { line: CartLineView; status: StockStatus } {
  const available = Math.max(0, v.onHand - v.reserved);
  const status = deriveStockStatus(available, v.preorderEnabled);
  const isPreorder = status === "PREORDER";
  const maxQty = isPreorder ? PREORDER_MAX_QTY : available;
  return {
    status,
    line: {
      sku: v.sku,
      productSlug: v.productId,
      name: v.name,
      modelCode: v.modelCode,
      variantLabel: variantLabel(v),
      imageUrl: v.images[0]?.url ?? null,
      priceIdr: v.priceIdr,
      qty: Math.min(qty, maxQty),
      maxQty,
      isPreorder,
      preorderLeadWeeks: isPreorder ? v.preorderLeadWeeks : null,
      status,
    },
  };
}

/**
 * Re-validate a cart against current stock: unknown/inactive SKUs and SOLD_OUT lines are removed,
 * qty is clamped to available (READY/LOW) or PREORDER_MAX_QTY (PREORDER), notices explain every change.
 */
export async function validateCart(items: CartValidateItem[]): Promise<ValidatedCart> {
  await maybeSweepExpiredOrders();
  const merged = mergeItems(items.filter((i) => i.qty > 0));
  const map = await loadVariants(merged.map((i) => i.sku));
  const lines: CartLineView[] = [];
  const notices: CartNotice[] = [];
  let weightGrams = 0;
  for (const it of merged) {
    const v = map.get(it.sku);
    if (!v || !v.isActive) {
      notices.push({ type: "UNKNOWN_SKU", sku: it.sku });
      continue;
    }
    const { line, status } = lineFor(v, it.qty);
    if (status === "SOLD_OUT") {
      notices.push({ type: "REMOVED_SOLD_OUT", sku: it.sku });
      continue;
    }
    if (line.isPreorder && it.isPreorder === false) notices.push({ type: "NOW_PREORDER", sku: it.sku });
    if (line.qty < it.qty) notices.push({ type: "QTY_REDUCED", sku: it.sku, from: it.qty, to: line.qty });
    lines.push(line);
    weightGrams += v.weightGrams * line.qty;
  }
  return {
    lines,
    notices,
    subtotalIdr: lines.reduce((s, l) => s + l.priceIdr * l.qty, 0),
    weightGrams,
    hasPreorder: lines.some((l) => l.isPreorder),
  };
}
