"use server";
/**
 * Storefront server actions (thin: Zod → service). Dates are returned as Date objects
 * (React serializes them across the action boundary).
 */
import { z } from "zod";
import type { ValidatedCart } from "@/lib/contracts";
import { validateCart } from "@/lib/services/cart";
import { requestBackInStock, type BackInStockResult } from "@/lib/services/stock";
import { cartValidateItemsSchema, localeSchema, skuSchema } from "@/lib/services/schemas";

const EMPTY_CART: ValidatedCart = { lines: [], notices: [], subtotalIdr: 0, weightGrams: 0, hasPreorder: false };

/** CART-02: re-validate the localStorage cart. Invalid payload → empty cart. */
export async function validateCartAction(items: { sku: string; qty: number; isPreorder?: boolean }[]): Promise<ValidatedCart> {
  const parsed = cartValidateItemsSchema.safeParse(items);
  if (!parsed.success) return EMPTY_CART;
  return validateCart(parsed.data);
}

const bisSchema = z.object({ sku: skuSchema, wa: z.string().min(6).max(30), locale: localeSchema });

/** STK-07 "Kabari Saya via WA" */
export async function requestBackInStockAction(input: { sku: string; wa: string; locale: "id" | "en" }): Promise<BackInStockResult | { ok: false; error: "INVALID_INPUT" }> {
  const parsed = bisSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "INVALID_INPUT" };
  return requestBackInStock(parsed.data.sku, parsed.data.wa, parsed.data.locale);
}
