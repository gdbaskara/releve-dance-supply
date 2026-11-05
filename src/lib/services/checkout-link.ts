/** Admin checkout links (ADM-05, CHK-10). Token = 24 url-safe chars, valid 48 h, single use. Server-only. */
import { randomBytes } from "node:crypto";
import { desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { checkoutLinks, orders, variants } from "@/db/schema";
import type { CartItemInput, Locale, ValidatedCart } from "@/lib/contracts";
import { normalizePhoneID } from "@/lib/format/phone";
import { buildWaLinkTo } from "@/lib/wa/link";
import { checkoutLinkShareText } from "@/lib/wa/admin-text";
import { mergeItems, validateCart } from "./cart";
import { urls } from "./notify";

export const CHECKOUT_LINK_TTL_HOURS = 48;

export function generateLinkToken(): string {
  return randomBytes(18).toString("base64url"); // 24 chars
}

export type CreateCheckoutLinkResult =
  | { ok: true; token: string; url: string; expiresAt: Date; waLink: string | null }
  | { ok: false; error: "INVALID_INPUT" | "UNKNOWN_SKU" | "INVALID_WA"; skus?: string[] };

export async function createCheckoutLink(
  input: { items: CartItemInput[]; customerName?: string; customerWa?: string; locale?: Locale },
  actor: string,
  now: Date = new Date(),
): Promise<CreateCheckoutLinkResult> {
  const items = mergeItems(input.items.filter((i) => Number.isInteger(i.qty) && i.qty > 0));
  if (items.length === 0 || items.length > 50) return { ok: false, error: "INVALID_INPUT" };
  const found = await db.select({ sku: variants.sku }).from(variants).where(inArray(variants.sku, items.map((i) => i.sku)));
  const known = new Set(found.map((f) => f.sku));
  const missing = items.filter((i) => !known.has(i.sku)).map((i) => i.sku);
  if (missing.length) return { ok: false, error: "UNKNOWN_SKU", skus: missing };
  let wa: string | null = null;
  if (input.customerWa?.trim()) {
    wa = normalizePhoneID(input.customerWa);
    if (!wa) return { ok: false, error: "INVALID_WA" };
  }
  const token = generateLinkToken();
  const expiresAt = new Date(now.getTime() + CHECKOUT_LINK_TTL_HOURS * 3_600_000);
  await db.insert(checkoutLinks).values({
    token, items, customerName: input.customerName?.trim() || null, customerWa: wa, createdBy: actor, expiresAt, createdAt: now,
  });
  const locale = input.locale ?? "id";
  const url = urls.checkoutLink(locale, token);
  const waLink = wa ? buildWaLinkTo(wa, checkoutLinkShareText(locale, { name: input.customerName, url })) : null;
  return { ok: true, token, url, expiresAt, waLink };
}

export type ResolveCheckoutLinkResult =
  | { ok: true; token: string; cart: ValidatedCart; prefill: { name: string | null; wa: string | null }; expiresAt: Date }
  | { ok: false; error: "LINK_EXPIRED" };

/** CHK-10: unknown / expired / already used → LINK_EXPIRED (generic). */
export async function resolveCheckoutLink(token: string, now: Date = new Date()): Promise<ResolveCheckoutLinkResult> {
  if (!token || token.length > 100) return { ok: false, error: "LINK_EXPIRED" };
  const [link] = await db.select().from(checkoutLinks).where(eq(checkoutLinks.token, token)).limit(1);
  if (!link || link.usedOrderId || link.expiresAt <= now) return { ok: false, error: "LINK_EXPIRED" };
  const cart = await validateCart(link.items);
  return { ok: true, token, cart, prefill: { name: link.customerName, wa: link.customerWa }, expiresAt: link.expiresAt };
}

export interface CheckoutLinkRow {
  token: string;
  url: string;
  items: CartItemInput[];
  customerName: string | null;
  customerWa: string | null;
  createdBy: string;
  createdAt: Date;
  expiresAt: Date;
  status: "ACTIVE" | "USED" | "EXPIRED";
  usedOrderNo: string | null;
}

export async function listCheckoutLinks(limit = 50, now: Date = new Date()): Promise<CheckoutLinkRow[]> {
  const rows = await db
    .select({ l: checkoutLinks, orderNo: orders.orderNo })
    .from(checkoutLinks)
    .leftJoin(orders, eq(orders.id, checkoutLinks.usedOrderId))
    .orderBy(desc(checkoutLinks.createdAt))
    .limit(limit);
  return rows.map(({ l, orderNo }) => ({
    token: l.token,
    url: urls.checkoutLink("id", l.token),
    items: l.items,
    customerName: l.customerName,
    customerWa: l.customerWa,
    createdBy: l.createdBy,
    createdAt: l.createdAt,
    expiresAt: l.expiresAt,
    status: l.usedOrderId ? "USED" : l.expiresAt <= now ? "EXPIRED" : "ACTIVE",
    usedOrderNo: orderNo ?? null,
  }));
}
