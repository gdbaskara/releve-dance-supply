/** DB test harness: serialises DB test files with an advisory lock, ensures the schema, resets & seeds fixtures. */
import { execSync } from "node:child_process";
import postgres from "postgres";
import { afterAll, beforeAll } from "vitest";
import { TEST_DATABASE_URL } from "./env";
import { db, pgClient } from "@/db";
import { products, variants, vouchers } from "@/db/schema";
import { truncateAll } from "@/db/seed";
import { __resetSweepThrottle } from "@/lib/services/expiry";
import { __resetRateLimits } from "@/lib/services/rate-limit";
import type { CreateOrderInput } from "@/lib/contracts";

const LOCK_ID = 7_340_001;

export function setupTestDb(): void {
  let lock: ReturnType<typeof postgres> | null = null;
  beforeAll(async () => {
    lock = postgres(TEST_DATABASE_URL, { max: 1, onnotice: () => {} });
    await lock`select pg_advisory_lock(${LOCK_ID})`;
    const [{ reg }] = await lock`select to_regclass('public.products')::text as reg`;
    if (!reg) {
      execSync("pnpm exec drizzle-kit push --force", { env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL }, stdio: "ignore" });
    }
  }, 180_000);
  afterAll(async () => {
    await pgClient.end({ timeout: 5 });
    if (lock) {
      await lock`select pg_advisory_unlock(${LOCK_ID})`;
      await lock.end({ timeout: 5 });
    }
  });
}

export const P_SHOE = "test-shoe";
export const P_LEO = "test-leo";

/** Fresh fixture: 2 products, 6 variants (READY 10 / LAST 1 / LOW 2 / PRE 0+preorder / OUT 0 / leotard 5), voucher RELEVE10. */
export async function resetWithFixture(): Promise<void> {
  __resetSweepThrottle();
  __resetRateLimits();
  await truncateAll(db);
  const base = {
    brand: "Só Dança", msrpUsd: "30.00", landedCostIdr: 300_000, descriptionEn: "Stretch canvas split sole",
    descriptionId: "Ballet flats", featuresId: ["a"], featuresEn: ["a"], images: [], referenceImageUrl: null,
  };
  await db.insert(products).values([
    { ...base, id: P_SHOE, modelCode: "TS01", name: "Test Slipper", discipline: "Ballet", audience: "Adult", group: "shoes",
      priceIdr: 500_000, colors: ["Ballet Pink", "Black"], widths: ["M"], options: ["Color", "Size", "Width"], sortOrder: 0 },
    { ...base, id: P_LEO, modelCode: "TL02", name: "Test Leotard", discipline: "Leotards", audience: "Kids", group: "apparel",
      priceIdr: 800_000, colors: ["Black"], widths: [], options: ["Color", "Size"], sortOrder: 1 },
  ]);
  const v = (sku: string, onHand: number, extra: Partial<typeof variants.$inferInsert> = {}) => ({
    sku, productId: P_SHOE, color: "Ballet Pink", size: "7.5", width: "M", weightGrams: 300, onHand, reserved: 0,
    preorderEnabled: false, preorderLeadWeeks: null, ...extra,
  });
  await db.insert(variants).values([
    v("T-READY", 10, { sortOrder: 0 }),
    v("T-LAST", 1, { size: "8", sortOrder: 1 }),
    v("T-LOW", 2, { size: "8.5", sortOrder: 2 }),
    v("T-PRE", 0, { size: "9", preorderEnabled: true, preorderLeadWeeks: "4-6", sortOrder: 3 }),
    v("T-OUT", 0, { size: "9.5", color: "Black", sortOrder: 4 }),
    v("L-M", 5, { productId: P_LEO, color: "Black", size: "M", width: null, weightGrams: 150, sortOrder: 0 }),
  ]);
  await db.insert(vouchers).values({ code: "RELEVE10", type: "percent", value: 10, minSubtotalIdr: 500_000, active: true });
}

export function orderInput(overrides: Partial<CreateOrderInput> = {}): CreateOrderInput {
  return {
    locale: "id",
    contact: { name: "Test Buyer", wa: "0812-3456-7890", waOptIn: true },
    address: { province: "DKI Jakarta", city: "Kota Jakarta Selatan", district: "Kebayoran Baru", postalCode: "12160", line: "Jl. Senopati No. 1" },
    shippingServiceCode: "jne_reg",
    insured: true,
    method: "QRIS",
    items: [{ sku: "T-READY", qty: 1 }],
    ...overrides,
  };
}
