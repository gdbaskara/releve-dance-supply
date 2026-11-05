import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  APPAREL_ROWS,
  CONTEMPORARY_ROWS,
  TIGHTS_ROWS,
  guideCategoryFor,
  shoeRows,
  sizeKey,
  widthRows,
  type SizeGuideCategory,
} from "@/components/store/size-guide-data";
import { normalizeRawSize } from "@/lib/data/size-normalize";

interface RawProduct {
  discipline: string;
  pricing: { group: string };
  variants: { size?: string; width?: string }[];
}
const catalog: RawProduct[] = JSON.parse(readFileSync(join(process.cwd(), "data/catalog/products.json"), "utf8")).products;

describe("shoeRows", () => {
  it("builds rows grouped toddler -> child -> adult with increasing foot length", () => {
    const rows = shoeRows("tapCharacter");
    const groups = rows.map((r) => r.group);
    expect(groups.indexOf("adult")).toBeGreaterThan(groups.lastIndexOf("child"));
    expect(groups.lastIndexOf("toddler")).toBeLessThan(groups.indexOf("child"));
    for (const g of ["toddler", "child", "adult"] as const) {
      const cms = rows.filter((r) => r.group === g).map((r) => r.cm);
      expect([...cms].sort((a, b) => a - b)).toEqual(cms);
    }
  });
  it("keeps the anchor values of the original chart", () => {
    const adult = shoeRows("balletJazz").find((r) => r.key === "8.0L (adult)")!;
    expect(adult).toMatchObject({ label: "8", cm: 24.2, eu: "38.5" });
    const kid = shoeRows("balletJazz").find((r) => r.key === "1.0s (child)")!;
    expect(kid).toMatchObject({ label: "1s", cm: 19.8, eu: "32" });
  });
  it("gives each category its own range", () => {
    const keys = (c: Exclude<SizeGuideCategory, "dancewear">) => shoeRows(c).map((r) => r.key);
    expect(keys("ballroom")).not.toContain("8.0s (toddler)");
    expect(keys("pointe")).toContain("2.0L (child)");
    expect(keys("balletJazz")).not.toEqual(keys("tapCharacter"));
  });
});

describe("size guide covers every size and width on sale", () => {
  it("each shoe size of the catalog appears in its category table", () => {
    const missing: string[] = [];
    for (const p of catalog) {
      const cat = guideCategoryFor(p.discipline, p.pricing.group);
      for (const v of p.variants) {
        if (!v.size) continue;
        const raw = normalizeRawSize(v.size)!;
        const ok =
          cat === "dancewear"
            ? [...APPAREL_ROWS, ...TIGHTS_ROWS].some((r) => r.size === raw)
            : shoeRows(cat).some((r) => r.key === sizeKey(raw)) ||
              (cat === "balletJazz" && CONTEMPORARY_ROWS.some((r) => r.size === raw));
        if (!ok) missing.push(`${p.discipline}:${raw}`);
      }
    }
    expect([...new Set(missing)]).toEqual([]);
  });
  it("each width of the catalog is explained in its category", () => {
    const missing: string[] = [];
    for (const p of catalog) {
      const cat = guideCategoryFor(p.discipline, p.pricing.group);
      const known: string[] = widthRows(cat);
      for (const v of p.variants) if (v.width && !known.includes(v.width)) missing.push(`${p.discipline}:${v.width}`);
    }
    expect([...new Set(missing)]).toEqual([]);
  });
});

describe("sizeKey", () => {
  it("canonicalises raw sizes so they match table rows", () => {
    expect(sizeKey("10L (adult)")).toBe("10.0L (adult)");
    expect(sizeKey("8s (toddler)")).toBe("8.0s (toddler)");
    expect(sizeKey("M")).toBe("M");
  });
});
