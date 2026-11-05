/** Vouchers (CHK-09). One code per order; percent or fixed; computed server-side. */
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { vouchers } from "@/db/schema";
import type { DbOrTx } from "./db-types";

export type VoucherResult =
  | { ok: true; code: string; type: "percent" | "fixed"; value: number; discountIdr: number }
  | { ok: false; error: "NOT_FOUND" | "INACTIVE" | "EXPIRED" | "MIN_SUBTOTAL"; minSubtotalIdr?: number };

export function computeDiscount(type: "percent" | "fixed", value: number, subtotalIdr: number): number {
  const raw = type === "percent" ? Math.floor((subtotalIdr * value) / 100) : value;
  return Math.max(0, Math.min(raw, subtotalIdr));
}

export async function applyVoucher(code: string, subtotalIdr: number, now: Date = new Date(), conn: DbOrTx = db): Promise<VoucherResult> {
  const normalized = code.trim().toUpperCase();
  if (!normalized) return { ok: false, error: "NOT_FOUND" };
  const [v] = await conn.select().from(vouchers).where(eq(vouchers.code, normalized)).limit(1);
  if (!v) return { ok: false, error: "NOT_FOUND" };
  if (!v.active) return { ok: false, error: "INACTIVE" };
  if (v.expiresAt && v.expiresAt <= now) return { ok: false, error: "EXPIRED" };
  if (subtotalIdr < v.minSubtotalIdr) return { ok: false, error: "MIN_SUBTOTAL", minSubtotalIdr: v.minSubtotalIdr };
  return { ok: true, code: v.code, type: v.type, value: v.value, discountIdr: computeDiscount(v.type, v.value, subtotalIdr) };
}
