import { describe, expect, it } from "vitest";
import { aggregateStockStatus, deriveStockStatus } from "@/lib/contracts";
import { computeDiscount } from "@/lib/services/voucher";
import { variantLabel, paymentMethodLabel } from "@/lib/services/labels";
import { generateOrderNo } from "@/lib/services/order";
import { compareSizes } from "@/lib/services/catalog";
import { rateLimit, __resetRateLimits } from "@/lib/services/rate-limit";
import { createOrderInputSchema, paymentMethodSchema, phoneSchema } from "@/lib/services/schemas";
import { fillTemplate } from "@/lib/wa/templates";
import { buildProductCopy } from "@/db/seed/content";
import { lookupZone } from "@/lib/services/shipping";
import { mergeItems } from "@/lib/services/cart";
import { loadRawCatalog } from "@/lib/data/catalog";
import glossary from "../../../design-system/glossary.json";

describe("stock math (STK-01/02)", () => {
  it("derives status from available", () => {
    expect(deriveStockStatus(4, false)).toBe("READY");
    expect(deriveStockStatus(3, false)).toBe("LOW");
    expect(deriveStockStatus(1, true)).toBe("LOW");
    expect(deriveStockStatus(0, true)).toBe("PREORDER");
    expect(deriveStockStatus(0, false)).toBe("SOLD_OUT");
    expect(aggregateStockStatus(["SOLD_OUT", "LOW"])).toBe("READY");
    expect(aggregateStockStatus(["SOLD_OUT", "PREORDER"])).toBe("PREORDER");
    expect(aggregateStockStatus(["SOLD_OUT"])).toBe("SOLD_OUT");
  });
  it("merges duplicate cart lines", () => {
    expect(mergeItems([{ sku: "A", qty: 1 }, { sku: "B", qty: 2 }, { sku: "A", qty: 3 }])).toEqual([{ sku: "A", qty: 4 }, { sku: "B", qty: 2 }]);
  });
});

describe("money", () => {
  it("voucher discount is integer and capped at subtotal", () => {
    expect(computeDiscount("percent", 10, 675_005)).toBe(67_500);
    expect(computeDiscount("fixed", 50_000, 30_000)).toBe(30_000);
    expect(computeDiscount("fixed", -5, 30_000)).toBe(0);
  });
});

describe("labels & order numbers", () => {
  it("variant label", () => {
    expect(variantLabel({ color: "Ballet Pink", size: "7.5", width: "M", shank: null })).toBe("Ballet Pink · 7.5 · M");
    expect(variantLabel({ size: "M" })).toBe("M");
  });
  it("payment labels", () => {
    expect(paymentMethodLabel("VA", "BCA", "id")).toBe("Virtual Account BCA");
    expect(paymentMethodLabel("EWALLET", "SHOPEEPAY", "id")).toBe("ShopeePay");
    expect(paymentMethodLabel("CARD", null, "en")).toBe("Credit/debit card");
    expect(paymentMethodLabel("QRIS", null, "id")).toBe("QRIS");
  });
  it("order no = RDS-YYMMDD-XXXX with the WIB date (ORD-01)", () => {
    // 2026-11-05 20:00 UTC = 2026-11-06 03:00 WIB
    const no = generateOrderNo(new Date(Date.UTC(2026, 10, 5, 20, 0)));
    expect(no).toMatch(/^RDS-261106-[0-9A-HJKMNP-TV-Z]{4}$/);
    const many = new Set(Array.from({ length: 200 }, () => generateOrderNo()));
    expect(many.size).toBeGreaterThan(190);
  });
  it("size ordering: toddler → child → adult → letters", () => {
    const sizes = ["M", "7.5L (adult)", "1.0s (child)", "10.0s (child)", "8.0s (toddler)", "S", "10.0L (adult)"];
    expect([...sizes].sort(compareSizes)).toEqual(["8.0s (toddler)", "10.0s (child)", "1.0s (child)", "7.5L (adult)", "10.0L (adult)", "S", "M"]);
  });
});

describe("schemas", () => {
  const base = {
    locale: "id", contact: { name: "Sari", wa: "0812-3456-7890", waOptIn: true },
    address: { province: "DKI Jakarta", city: "Kota Jakarta Selatan", district: "Tebet", postalCode: "12810", line: "Jl. Tebet Raya 1" },
    shippingServiceCode: "jne_reg", insured: true, method: "QRIS", items: [{ sku: "A", qty: 1 }],
  };
  it("normalises WA numbers to E.164 (CHK-02)", () => {
    for (const raw of ["0812-3456-7890", "62812 3456 7890", "+62 812-3456-7890"]) {
      const r = createOrderInputSchema.safeParse({ ...base, contact: { ...base.contact, wa: raw } });
      expect(r.success && r.data.contact.wa).toBe("+6281234567890");
    }
    expect(phoneSchema.safeParse("0812345").success).toBe(false);
    expect(phoneSchema.safeParse("+62 812 3456 7890 12345").success).toBe(false);
  });
  it("payment method enum has no cash-on-delivery or installment option (CHK-05)", () => {
    expect(paymentMethodSchema.options).toEqual(["QRIS", "EWALLET", "VA", "CARD"]);
    for (const bad of ["COD", "cod", "CASH", "INSTALLMENT", "PAYLATER"]) expect(paymentMethodSchema.safeParse(bad).success).toBe(false);
    expect(createOrderInputSchema.safeParse({ ...base, method: "COD" }).success).toBe(false);
  });
  it("VA / e-wallet require a matching channel", () => {
    expect(createOrderInputSchema.safeParse({ ...base, method: "VA" }).success).toBe(false);
    expect(createOrderInputSchema.safeParse({ ...base, method: "VA", channel: "GOPAY" }).success).toBe(false);
    expect(createOrderInputSchema.safeParse({ ...base, method: "VA", channel: "BCA" }).success).toBe(true);
    expect(createOrderInputSchema.safeParse({ ...base, method: "EWALLET", channel: "OVO" }).success).toBe(true);
    expect(createOrderInputSchema.safeParse({ ...base, items: [] }).success).toBe(false);
    expect(createOrderInputSchema.safeParse({ ...base, address: { ...base.address, postalCode: "123" } }).success).toBe(false);
  });
});

describe("zones", () => {
  it("derives zone server-side and rejects non-Java", () => {
    expect(lookupZone("DKI Jakarta", "Kota Jakarta Selatan")).toEqual({ ok: true, zone: "Z1" });
    expect(lookupZone("Banten", "Kota Tangerang Selatan")).toEqual({ ok: true, zone: "Z1" });
    expect(lookupZone("Jawa Timur", "Kota Surabaya")).toEqual({ ok: true, zone: "Z4" });
    expect(lookupZone("Bali", "Kota Denpasar")).toEqual({ ok: false, error: "OUTSIDE_JAVA" });
    expect(lookupZone("DKI Jakarta", "Kota Bandung")).toEqual({ ok: false, error: "UNKNOWN_CITY" });
  });
});

describe("misc", () => {
  it("fillTemplate tidies missing vars", () => {
    expect(fillTemplate("Halo {name} {variant}, ok", { name: "Roy" })).toBe("Halo Roy, ok");
  });
  it("rate limiter", () => {
    __resetRateLimits();
    expect(rateLimit("k", 2, 1000, 0).ok).toBe(true);
    expect(rateLimit("k", 2, 1000, 1).ok).toBe(true);
    expect(rateLimit("k", 2, 1000, 2).ok).toBe(false);
    expect(rateLimit("k", 2, 1000, 1001).ok).toBe(true);
  });
  it("seed copy: 3–4 features id/en and no forbidden strings for every product", () => {
    for (const p of loadRawCatalog()) {
      const c = buildProductCopy(p);
      expect(c.featuresId.length).toBeGreaterThanOrEqual(3);
      expect(c.featuresId.length).toBeLessThanOrEqual(4);
      expect(c.featuresEn.length).toBe(c.featuresId.length);
      const all = [c.descriptionId, ...c.featuresId, ...c.featuresEn].join(" ");
      for (const f of glossary.forbidden_strings) expect(all).not.toContain(f);
    }
  });
});
