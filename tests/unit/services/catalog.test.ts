import "./helpers/env";
import { beforeEach, describe, expect, it } from "vitest";
import { getCatalog, getCollections, getProduct, getRelated } from "@/lib/services/catalog";
import { validateCart } from "@/lib/services/cart";
import { getShippingRates } from "@/lib/services/shipping";
import { applyVoucher } from "@/lib/services/voucher";
import { createOrder } from "@/lib/services/order";
import { db } from "@/db";
import { products, variants, vouchers } from "@/db/schema";
import { eq } from "drizzle-orm";
import { orderInput, resetWithFixture, setupTestDb } from "./helpers/db";

setupTestDb();
beforeEach(resetWithFixture);

describe("catalog (CAT-02..06)", () => {
  it("lists, searches by name/model code, sorts", async () => {
    const all = await getCatalog();
    expect(all.total).toBe(2);
    expect(all.items[0]).toMatchObject({ slug: "test-shoe", status: "READY", modelCode: "TS01", image: null });
    expect((await getCatalog({ q: "ts01" })).items.map((i) => i.slug)).toEqual(["test-shoe"]);
    expect((await getCatalog({ q: "LEOTARD" })).items.map((i) => i.slug)).toEqual(["test-leo"]);
    expect((await getCatalog({ q: "zzz" })).total).toBe(0);
    expect((await getCatalog({ sort: "price_desc" })).items[0].slug).toBe("test-leo");
    expect((await getCatalog({ sort: "price_asc" })).items[0].slug).toBe("test-shoe");
    expect(all.priceRange).toEqual({ min: 500_000, max: 800_000 });
    expect((await getCatalog({ pageSize: 1, page: 2 })).items.map((i) => i.slug)).toEqual(["test-leo"]);
  });

  it("filters combine at variant level; facets are disjunctive", async () => {
    expect((await getCatalog({ disciplines: ["Leotards"] })).total).toBe(1);
    expect((await getCatalog({ audience: ["Kids"] })).items[0].slug).toBe("test-leo");
    expect((await getCatalog({ minPrice: 600_000 })).total).toBe(1);
    expect((await getCatalog({ sizes: ["9"], availability: ["PREORDER"] })).total).toBe(1);
    expect((await getCatalog({ sizes: ["9"], availability: ["READY"] })).total).toBe(0);
    expect((await getCatalog({ colors: ["Black"], widths: ["M"] })).total).toBe(1);
    const f = await getCatalog({ disciplines: ["Ballet"] });
    expect(f.facets.discipline).toEqual([{ value: "Ballet", count: 1 }, { value: "Leotards", count: 1 }]);
    expect(f.facets.size.map((s) => s.value)).toEqual(["7.5", "8", "8.5", "9", "9.5"]);
    expect(f.facets.width).toEqual([{ value: "M", count: 1 }]);
  });

  it("a colour filter swaps the card photo to that colour and remembers it for the PDP link", async () => {
    await db
      .update(products)
      .set({
        images: [
          { url: "pink.jpg", alt: "pink", color: "Ballet Pink" },
          { url: "black.jpg", alt: "black", color: "Black" },
        ],
      })
      .where(eq(products.id, "test-shoe"));
    const plain = (await getCatalog({ disciplines: ["Ballet"] })).items[0];
    expect(plain).toMatchObject({ image: { url: "pink.jpg" } });
    expect(plain.matchedColor ?? null).toBeNull();
    const black = (await getCatalog({ colors: ["Black"], disciplines: ["Ballet"] })).items[0];
    expect(black).toMatchObject({ image: { url: "black.jpg" }, matchedColor: "Black" });
  });

  it("widths sort letters first, then Narrow / Medium / Wide", async () => {
    await db.update(variants).set({ width: "Wide" }).where(eq(variants.sku, "T-LAST"));
    await db.update(variants).set({ width: "Narrow" }).where(eq(variants.sku, "T-LOW"));
    await db.update(variants).set({ width: "Medium" }).where(eq(variants.sku, "T-PRE"));
    const f = await getCatalog({ disciplines: ["Ballet"] });
    expect(f.facets.width.map((w) => w.value)).toEqual(["M", "Narrow", "Medium", "Wide"]);
  });

  it("getProduct with derived variant status; getRelated; collections", async () => {
    const p = await getProduct("test-shoe");
    expect(p!.variants.map((v) => [v.sku, v.status, v.available])).toEqual([
      ["T-READY", "READY", 10], ["T-LAST", "LOW", 1], ["T-LOW", "LOW", 2], ["T-PRE", "PREORDER", 0], ["T-OUT", "SOLD_OUT", 0],
    ]);
    expect(p!.variants.find((v) => v.sku === "T-PRE")!.preorderLeadWeeks).toBe("4-6");
    expect(await getProduct("nope")).toBeNull();
    expect((await getRelated("test-shoe", 3)).map((r) => r.slug)).toEqual([]);
    expect(await getRelated("nope")).toEqual([]);
    const c = await getCollections();
    expect(c.readyStock.map((x) => x.slug)).toEqual(["test-shoe", "test-leo"]);
    expect(c.kids.map((x) => x.slug)).toEqual(["test-leo"]);
  });
});

describe("validateCart (CART-02/03)", () => {
  it("clamps, removes and flags with notices", async () => {
    await createOrder(orderInput({ items: [{ sku: "T-LOW", qty: 1 }] })); // 1 left
    const cart = await validateCart([
      { sku: "T-READY", qty: 2 }, { sku: "T-READY", qty: 1 }, { sku: "T-LOW", qty: 3 }, { sku: "T-PRE", qty: 9, isPreorder: false },
      { sku: "T-OUT", qty: 1 }, { sku: "NOPE", qty: 1 }, { sku: "L-M", qty: 0 },
    ]);
    expect(cart.lines.map((l) => [l.sku, l.qty, l.maxQty, l.isPreorder])).toEqual([
      ["T-READY", 3, 10, false], ["T-LOW", 1, 1, false], ["T-PRE", 5, 5, true],
    ]);
    expect(cart.lines[0].variantLabel).toBe("Ballet Pink · 7.5 · M");
    expect(cart.notices).toEqual([
      { type: "QTY_REDUCED", sku: "T-LOW", from: 3, to: 1 },
      { type: "NOW_PREORDER", sku: "T-PRE" },
      { type: "QTY_REDUCED", sku: "T-PRE", from: 9, to: 5 },
      { type: "REMOVED_SOLD_OUT", sku: "T-OUT" },
      { type: "UNKNOWN_SKU", sku: "NOPE" },
    ]);
    expect(cart.subtotalIdr).toBe(9 * 500_000);
    expect(cart.weightGrams).toBe(9 * 300);
    expect(cart.hasPreorder).toBe(true);
  });
});

describe("shipping & voucher services", () => {
  it("getShippingRates derives zone, rejects non-Java and empty carts", async () => {
    const r = await getShippingRates({ province: "Jawa Tengah", city: "Kota Semarang" }, [{ sku: "T-READY", qty: 4 }]);
    expect(r.ok && r.zone).toBe("Z3");
    if (r.ok) {
      expect(r.billableKg).toBe(2); // 1200 + 150 g
      expect(r.rates.find((x) => x.serviceCode === "jne_reg")!.priceIdr).toBe(36_000);
      expect(r.rates.some((x) => x.type === "instant")).toBe(false);
    }
    expect(await getShippingRates({ province: "Bali", city: "Kota Denpasar" }, [{ sku: "T-READY", qty: 1 }])).toEqual({ ok: false, error: "OUTSIDE_JAVA" });
    expect(await getShippingRates({ province: "DKI Jakarta", city: "Kota Jakarta Pusat" }, [{ sku: "T-OUT", qty: 1 }])).toEqual({ ok: false, error: "EMPTY_CART" });
  });

  it("applyVoucher", async () => {
    expect(await applyVoucher(" releve10 ", 1_000_000)).toEqual({ ok: true, code: "RELEVE10", type: "percent", value: 10, discountIdr: 100_000 });
    expect(await applyVoucher("RELEVE10", 499_999)).toEqual({ ok: false, error: "MIN_SUBTOTAL", minSubtotalIdr: 500_000 });
    expect(await applyVoucher("", 1)).toEqual({ ok: false, error: "NOT_FOUND" });
    await db.insert(vouchers).values([
      { code: "OFF", type: "fixed", value: 1, active: false },
      { code: "OLD", type: "fixed", value: 1, expiresAt: new Date(Date.now() - 1000) },
    ]);
    expect(await applyVoucher("OFF", 1)).toEqual({ ok: false, error: "INACTIVE" });
    expect(await applyVoucher("OLD", 1)).toEqual({ ok: false, error: "EXPIRED" });
  });
});
