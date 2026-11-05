import { describe, expect, it } from "vitest";
import { detectStockAlerts, waMeLink } from "@/lib/services/low-stock";

describe("detectStockAlerts (threshold 3)", () => {
  const alerts = (before: number, after: number) => detectStockAlerts([{ sku: "S", before, after }], 3);

  it("alerts LOW once when available crosses into 1..3", () => {
    expect(alerts(5, 3)).toEqual([{ sku: "S", kind: "LOW", available: 3 }]);
    expect(alerts(4, 1)).toEqual([{ sku: "S", kind: "LOW", available: 1 }]);
  });

  it("alerts OUT when available reaches 0 from above, even skipping the LOW band", () => {
    expect(alerts(1, 0)).toEqual([{ sku: "S", kind: "OUT", available: 0 }]);
    expect(alerts(6, 0)).toEqual([{ sku: "S", kind: "OUT", available: 0 }]);
  });

  it("stays quiet when nothing crossed (no spam on every sale)", () => {
    expect(alerts(10, 9)).toEqual([]);
    expect(alerts(5, 4)).toEqual([]);
    expect(alerts(3, 2)).toEqual([]); // already low
    expect(alerts(0, 0)).toEqual([]);
    expect(alerts(2, 6)).toEqual([]); // restock
  });

  it("handles several SKUs and keeps their order", () => {
    const res = detectStockAlerts(
      [
        { sku: "A", before: 4, after: 3 },
        { sku: "B", before: 9, after: 8 },
        { sku: "C", before: 2, after: 0 },
      ],
      3,
    );
    expect(res.map((r) => `${r.sku}:${r.kind}`)).toEqual(["A:LOW", "C:OUT"]);
  });
});

describe("waMeLink", () => {
  it("builds a wa.me link with the digits only and the text encoded", () => {
    expect(waMeLink("+62 812-0000-0000", "Stok menipis: A & B")).toBe("https://wa.me/6281200000000?text=Stok%20menipis%3A%20A%20%26%20B");
  });
});
