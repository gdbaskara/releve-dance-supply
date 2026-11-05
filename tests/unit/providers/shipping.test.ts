import { describe, expect, it } from "vitest";
import { MockShippingProvider, billableKg, insuranceFor } from "@/lib/providers/shipping/mock";
import type { ShippingRateRequest } from "@/lib/contracts";

const provider = new MockShippingProvider();
/** WIB = UTC+7 */
const wib = (h: number, m = 0) => new Date(Date.UTC(2026, 10, 5, h - 7, m));
const req = (over: Partial<ShippingRateRequest> = {}): ShippingRateRequest => ({
  destination: { province: "DKI Jakarta", city: "Kota Jakarta Selatan", zone: "Z1", postalCode: "12160" },
  weightGrams: 300,
  itemValueIdr: 660_000,
  now: wib(10),
  ...over,
});

describe("MockShippingProvider (SHP-01/02, CHK-04)", () => {
  it("bills per started kg including 150 g packaging, min 1 kg", () => {
    expect(billableKg(0)).toBe(1);
    expect(billableKg(850)).toBe(1);
    expect(billableKg(851)).toBe(2);
    expect(billableKg(1850)).toBe(2);
    expect(billableKg(1851)).toBe(3);
  });

  it("insurance = max(2.500, 0,25% of item value)", () => {
    expect(insuranceFor(100_000)).toBe(2500);
    expect(insuranceFor(3_005_000)).toBe(7513);
  });

  it("Z1 before cutoff: instant first, then express, then regular — cheapest first per group", async () => {
    const rates = await provider.getRates(req());
    expect(rates.map((r) => r.serviceCode)).toEqual([
      "grab_sameday", "gosend_instant", "anteraja_nd", "jne_yes", "jnt_ez", "sicepat_reg", "jne_reg",
    ]);
    const jne = rates.find((r) => r.serviceCode === "jne_reg")!;
    expect(jne.priceIdr).toBe(10_000);
    expect(jne.etaUnit).toBe("days");
    expect(rates[0].etaUnit).toBe("hours");
    expect(rates.every((r) => r.insuranceIdr === 2500)).toBe(true);
  });

  it("instant respects cutoff in WIB (GrabExpress 14:00, GoSend 16:00)", async () => {
    const at1430 = await provider.getRates(req({ now: wib(14, 30) }));
    expect(at1430.map((r) => r.serviceCode)).toContain("gosend_instant");
    expect(at1430.map((r) => r.serviceCode)).not.toContain("grab_sameday");
    const at1600 = await provider.getRates(req({ now: wib(16, 0) }));
    expect(at1600.some((r) => r.type === "instant")).toBe(false);
    const at1559 = await provider.getRates(req({ now: wib(15, 59) }));
    expect(at1559.some((r) => r.serviceCode === "gosend_instant")).toBe(true);
  });

  it("instant only for Z1 and within max_kg", async () => {
    const z2 = await provider.getRates(req({ destination: { province: "Jawa Barat", city: "Kota Bandung", zone: "Z2", postalCode: "40132" } }));
    expect(z2.some((r) => r.type === "instant")).toBe(false);
    expect(z2.find((r) => r.serviceCode === "jne_reg")!.priceIdr).toBe(14_000);
    const heavy = await provider.getRates(req({ weightGrams: 7_500 })); // 8 kg billable > grab max 7
    expect(heavy.map((r) => r.serviceCode)).toContain("gosend_instant");
    expect(heavy.map((r) => r.serviceCode)).not.toContain("grab_sameday");
    expect(heavy.find((r) => r.serviceCode === "jne_reg")!.priceIdr).toBe(80_000);
  });

  it("Z4 regular uses per_kg × kg", async () => {
    const z4 = await provider.getRates(req({ destination: { province: "Jawa Timur", city: "Kota Surabaya", zone: "Z4", postalCode: "60281" }, weightGrams: 1200 }));
    expect(z4.find((r) => r.serviceCode === "jne_reg")!.priceIdr).toBe(44_000);
  });
});
