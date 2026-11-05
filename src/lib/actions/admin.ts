"use server";
/**
 * Admin server actions. EVERY action calls requireAdmin() first (redirects to /admin/login when signed out).
 * Dates are returned as Date objects (React serializes them across the action boundary).
 */
import { z } from "zod";
import { redirect } from "next/navigation";
import { createAdminSession, destroyAdminSession, requireAdmin, verifyCredentials } from "@/lib/auth/session";
import { adjustStock, getProductAdmin, setPreorder, type AdjustStockResult, type ProductAdminDetail } from "@/lib/services/stock";
import { transitionOrder, type TransitionResult } from "@/lib/services/order-admin";
import { createCheckoutLink, type CreateCheckoutLinkResult } from "@/lib/services/checkout-link";
import { rateLimit } from "@/lib/services/rate-limit";
import { cartItemsSchema, localeSchema, orderNoSchema, orderStatusSchema, skuSchema } from "@/lib/services/schemas";

/**
 * Usable directly as <form action={loginAction}> with useActionState: (prevState, formData).
 * On success redirects to `next` (default /admin); on failure returns { ok: false, error }.
 */
export async function loginAction(
  _prev: { ok: false; error: "INVALID_CREDENTIALS" | "RATE_LIMITED" } | null,
  formData: FormData,
): Promise<{ ok: false; error: "INVALID_CREDENTIALS" | "RATE_LIMITED" }> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const nextRaw = String(formData.get("next") ?? "/admin");
  if (!rateLimit(`login:${email.toLowerCase()}`, 10, 10 * 60_000).ok) return { ok: false, error: "RATE_LIMITED" };
  const user = await verifyCredentials(email, password);
  if (!user) return { ok: false, error: "INVALID_CREDENTIALS" };
  await createAdminSession(user);
  redirect(nextRaw.startsWith("/admin") ? nextRaw : "/admin");
}

export async function logoutAction(): Promise<void> {
  await destroyAdminSession();
  redirect("/admin/login");
}

export async function adjustStockAction(sku: string, newOnHand: number): Promise<AdjustStockResult | { ok: false; error: "INVALID_INPUT" }> {
  const admin = await requireAdmin();
  const s = skuSchema.safeParse(sku);
  const n = z.number().int().min(0).max(100_000).safeParse(newOnHand);
  if (!s.success || !n.success) return { ok: false, error: "INVALID_INPUT" };
  return adjustStock(s.data, n.data, admin.email);
}

const preorderSchema = z.object({
  target: z.union([z.object({ sku: skuSchema }), z.object({ productId: z.string().min(1).max(120) })]),
  enabled: z.boolean(),
  lead: z.string().max(10).nullable().optional(),
});

export async function setPreorderAction(input: { target: { sku: string } | { productId: string }; enabled: boolean; lead?: string | null }) {
  await requireAdmin();
  const p = preorderSchema.safeParse(input);
  if (!p.success) return { ok: false as const, error: "INVALID_INPUT" as const };
  return setPreorder(p.data.target, p.data.enabled, p.data.lead ?? "4-6");
}

const transitionSchema = z.object({
  orderNo: orderNoSchema,
  to: orderStatusSchema,
  courier: z.string().trim().max(40).optional(),
  awb: z.string().trim().max(60).optional(),
});

export async function transitionOrderAction(input: { orderNo: string; to: string; courier?: string; awb?: string }): Promise<TransitionResult | { ok: false; error: "INVALID_INPUT" }> {
  const admin = await requireAdmin();
  const p = transitionSchema.safeParse(input);
  if (!p.success) return { ok: false, error: "INVALID_INPUT" };
  return transitionOrder(p.data.orderNo, p.data.to, { courier: p.data.courier, awb: p.data.awb, actor: admin.email });
}

const linkSchema = z.object({
  items: cartItemsSchema,
  customerName: z.string().trim().max(100).optional(),
  customerWa: z.string().trim().max(30).optional(),
  locale: localeSchema.optional(),
});

export async function createCheckoutLinkAction(input: { items: { sku: string; qty: number }[]; customerName?: string; customerWa?: string; locale?: "id" | "en" }): Promise<CreateCheckoutLinkResult> {
  const admin = await requireAdmin();
  const p = linkSchema.safeParse(input);
  if (!p.success) return { ok: false, error: "INVALID_INPUT" };
  return createCheckoutLink(p.data, admin.email);
}

/** Variant grid for client-side builders (checkout link, stock grid refresh). */
export async function getProductAdminAction(productId: string): Promise<ProductAdminDetail | null> {
  await requireAdmin();
  const id = z.string().min(1).max(120).safeParse(productId);
  return id.success ? getProductAdmin(id.data) : null;
}
