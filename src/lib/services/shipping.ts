/** Shipping quotes (SHP-01/02, CHK-04). Server derives the zone; non-Java destinations are rejected. */
import type { CartItemInput, ShippingRate, ShippingZone } from "@/lib/contracts";
import { getShippingProvider } from "@/lib/providers";
import { billableKg } from "@/lib/providers/shipping/mock";
import { isJavaProvince, resolveZone } from "@/lib/data/areas";
import { validateCart } from "./cart";

export interface ShippingDestinationInput { province: string; city: string; postalCode?: string }

export type ShippingQuoteResult =
  | { ok: true; zone: ShippingZone; rates: ShippingRate[]; weightGrams: number; billableKg: number; itemValueIdr: number }
  | { ok: false; error: "OUTSIDE_JAVA" | "UNKNOWN_CITY" | "EMPTY_CART" };

export type ZoneResult = { ok: true; zone: ShippingZone } | { ok: false; error: "OUTSIDE_JAVA" | "UNKNOWN_CITY" };

export function lookupZone(province: string, city: string): ZoneResult {
  if (!isJavaProvince(province)) return { ok: false, error: "OUTSIDE_JAVA" };
  const zone = resolveZone(province, city);
  return zone ? { ok: true, zone } : { ok: false, error: "UNKNOWN_CITY" };
}

/** Rates for an already-computed weight/value (used by createOrder so it re-quotes server-side). */
export async function quoteRates(
  dest: ShippingDestinationInput,
  weightGrams: number,
  itemValueIdr: number,
  now: Date = new Date(),
): Promise<ShippingQuoteResult> {
  const z = lookupZone(dest.province, dest.city);
  if (!z.ok) return z;
  const rates = await getShippingProvider().getRates({
    destination: { province: dest.province as never, city: dest.city, zone: z.zone, postalCode: dest.postalCode ?? "" },
    weightGrams,
    itemValueIdr,
    now,
  });
  return { ok: true, zone: z.zone, rates, weightGrams, billableKg: billableKg(weightGrams), itemValueIdr };
}

/** CHK-04: validated cart → weight & value → provider rates (Instan → Express → Reguler, cheapest first). */
export async function getShippingRates(
  address: ShippingDestinationInput,
  items: CartItemInput[],
  now: Date = new Date(),
): Promise<ShippingQuoteResult> {
  const z = lookupZone(address.province, address.city);
  if (!z.ok) return z;
  const cart = await validateCart(items);
  if (cart.lines.length === 0) return { ok: false, error: "EMPTY_CART" };
  return quoteRates(address, cart.weightGrams, cart.subtotalIdr, now);
}
