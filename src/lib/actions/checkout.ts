"use server";
/**
 * Checkout / pay / track server actions (thin: Zod → service).
 * Dates are returned as Date objects (React serializes them across the action boundary).
 */
import { z } from "zod";
import { headers } from "next/headers";
import type { CreateOrderResult, OrderPublicView } from "@/lib/contracts";
import { getShippingRates, type ShippingQuoteResult } from "@/lib/services/shipping";
import { applyVoucher, type VoucherResult } from "@/lib/services/voucher";
import { validateCart } from "@/lib/services/cart";
import {
  changePaymentMethod,
  createOrder,
  getOrderPublic,
  getOrderStatus,
  sendPaymentInstructions,
  type ChangePaymentResult,
  type OrderStatusView,
} from "@/lib/services/order";
import { resolveCheckoutLink, type ResolveCheckoutLinkResult } from "@/lib/services/checkout-link";
import { simulateCardPayment, simulatePayment, type SimulateResult } from "@/lib/services/payment";
import { rateLimit } from "@/lib/services/rate-limit";
import {
  cartItemsSchema,
  orderNoSchema,
  paymentChannelSchema,
  paymentMethodSchema,
  shippingAddressSchema,
  waLast4Schema,
} from "@/lib/services/schemas";

async function clientKey(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "local";
}

/** CHK-04 */
export async function getShippingRatesAction(
  address: { province: string; city: string; postalCode?: string },
  items: { sku: string; qty: number }[],
): Promise<ShippingQuoteResult | { ok: false; error: "INVALID_INPUT" }> {
  const a = shippingAddressSchema.safeParse(address);
  const i = cartItemsSchema.safeParse(items);
  if (!a.success || !i.success) return { ok: false, error: "INVALID_INPUT" };
  return getShippingRates(a.data, i.data);
}

/** CHK-09 — subtotal is recomputed from the items server-side (never trusted from the client). */
export async function applyVoucherAction(code: string, items: { sku: string; qty: number }[]): Promise<VoucherResult | { ok: false; error: "INVALID_INPUT" }> {
  const c = z.string().trim().min(1).max(40).safeParse(code);
  const i = cartItemsSchema.safeParse(items);
  if (!c.success || !i.success) return { ok: false, error: "INVALID_INPUT" };
  const cart = await validateCart(i.data);
  return applyVoucher(c.data, cart.subtotalIdr);
}

/** CHK-07 — payload = CreateOrderInput; validated by createOrder's Zod schema. Rate-limited 10/min per IP. */
export async function createOrderAction(payload: unknown): Promise<CreateOrderResult | { ok: false; error: "RATE_LIMITED" }> {
  if (!rateLimit(`order:${await clientKey()}`, 10, 60_000).ok) return { ok: false, error: "RATE_LIMITED" };
  return createOrder(payload);
}

/** PAY-10 */
export async function changePaymentMethodAction(orderNo: string, method: string, channel?: string): Promise<ChangePaymentResult> {
  const o = orderNoSchema.safeParse(orderNo);
  const m = paymentMethodSchema.safeParse(method);
  const c = channel === undefined ? { success: true as const, data: undefined } : paymentChannelSchema.safeParse(channel);
  if (!o.success || !m.success || !c.success) return { ok: false, error: "INVALID_INPUT" };
  return changePaymentMethod(o.data, m.data, c.data);
}

/** PAY-09 */
export async function sendPaymentInstructionsAction(orderNo: string): Promise<{ ok: true } | { ok: false; error: "NOT_FOUND" | "NOT_PENDING" | "RATE_LIMITED" }> {
  const o = orderNoSchema.safeParse(orderNo);
  if (!o.success) return { ok: false, error: "NOT_FOUND" };
  if (!rateLimit(`instr:${o.data}`, 3, 60_000).ok) return { ok: false, error: "RATE_LIMITED" };
  return sendPaymentInstructions(o.data);
}

/** PAY-06 polling (every 5 s) */
export async function getOrderStatusAction(orderNo: string): Promise<OrderStatusView | null> {
  const o = orderNoSchema.safeParse(orderNo);
  if (!o.success) return null;
  return getOrderStatus(o.data);
}

/** ORD-03 — null = generic "not found" (also for a wrong WA). Rate-limited 20/10 min per IP. */
export async function trackOrderAction(orderNo: string, waLast4: string): Promise<OrderPublicView | null | { error: "RATE_LIMITED" }> {
  if (!rateLimit(`track:${await clientKey()}`, 20, 10 * 60_000).ok) return { error: "RATE_LIMITED" };
  const o = orderNoSchema.safeParse(orderNo);
  const w = waLast4Schema.safeParse(waLast4);
  if (!o.success || !w.success) return null;
  return getOrderPublic(o.data, w.data);
}

/** CHK-10 */
export async function resolveCheckoutLinkAction(token: string): Promise<ResolveCheckoutLinkResult> {
  const t = z.string().trim().min(10).max(100).safeParse(token);
  if (!t.success) return { ok: false, error: "LINK_EXPIRED" };
  return resolveCheckoutLink(t.data);
}

/**
 * Mock-only payment completion used by the pay page itself (e-wallet "confirm" step, card 3DS step).
 * Goes through the same signed-webhook path as production. Refuses unless PAYMENT_PROVIDER=mock.
 * method "CARD" needs cardNumber (4000 0000 0000 0002 fails, others succeed); card data is never stored.
 */
export async function completeMockPaymentAction(orderNo: string, opts: { cardNumber?: string } = {}): Promise<SimulateResult | { ok: false; error: "INVALID_INPUT" }> {
  const o = orderNoSchema.safeParse(orderNo);
  if (!o.success) return { ok: false, error: "INVALID_INPUT" };
  if (opts.cardNumber !== undefined) {
    const digits = opts.cardNumber.replace(/\D/g, "");
    if (digits.length < 12 || digits.length > 19) return { ok: false, error: "INVALID_INPUT" };
    return simulateCardPayment(o.data, digits);
  }
  return simulatePayment(o.data, "PAID");
}
