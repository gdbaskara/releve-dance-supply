import { describe, expect, it } from "vitest";
import { colorLabel, facetNarrows, sizeOptions } from "@/components/store/containers/facet-format";
import { normalizeRawSize } from "@/lib/data/size-normalize";
import { imageForColors } from "@/lib/utils/image-for-color";

describe("normalizeRawSize (source typos)", () => {
  it("drops a stray closing parenthesis", () => {
    expect(normalizeRawSize("11.5s (child))")).toBe("11.5s (child)");
  });
  it("adds the missing L on adult numeric sizes", () => {
    expect(normalizeRawSize("6.5 (adult)")).toBe("6.5L (adult)");
  });
  it("leaves clean values alone", () => {
    for (const s of ["7.5L (adult)", "8.0s (toddler)", "2.0L (child)", "M", "Y-Jr.", "2XL-3XL"]) expect(normalizeRawSize(s)).toBe(s);
  });
  it("passes through null", () => {
    expect(normalizeRawSize(null)).toBeNull();
  });
});

describe("colorLabel", () => {
  it("strips leading numeric colour codes", () => {
    expect(colorLabel("04-Pink")).toBe("Pink");
    expect(colorLabel("1615-Perfect Pink")).toBe("Perfect Pink");
  });
  it("keeps normal names", () => {
    expect(colorLabel("Light Pink")).toBe("Light Pink");
    expect(colorLabel("Black-White")).toBe("Black-White");
  });
});

describe("sizeOptions", () => {
  const groupLabel = (g: string) => g.toUpperCase();
  it("labels sizes short and puts them in their group", () => {
    const res = sizeOptions(
      [
        { value: "8.0s (toddler)", count: 2 },
        { value: "10.0s (child)", count: 1 },
        { value: "3.0L (child)", count: 1 },
        { value: "3.0L (adult)", count: 3 },
      ],
      groupLabel,
    );
    expect(res).toEqual([
      { value: "8.0s (toddler)", label: "8s", count: 2, group: "TODDLER" },
      { value: "10.0s (child)", label: "10s", count: 1, group: "CHILD" },
      { value: "3.0L (child)", label: "3", count: 1, group: "CHILD" },
      { value: "3.0L (adult)", label: "3", count: 3, group: "ADULT" },
    ]);
  });
  it("leaves apparel sizes ungrouped", () => {
    expect(sizeOptions([{ value: "M", count: 4 }], groupLabel)).toEqual([{ value: "M", label: "M", count: 4, group: undefined }]);
  });
  it("disambiguates labels that still collide inside a group", () => {
    const res = sizeOptions(
      [
        { value: "2.0L (child)", count: 1 },
        { value: "2.0 (child)", count: 1 },
      ],
      groupLabel,
    );
    expect(new Set(res.map((o) => o.label)).size).toBe(2);
  });
});

describe("facetNarrows", () => {
  it("is false when every option keeps all products or none", () => {
    expect(facetNarrows([{ count: 7 }, { count: 7 }], 7)).toBe(false);
    expect(facetNarrows([{ count: 7 }, { count: 0 }, { count: 0 }], 7)).toBe(false);
  });
  it("is true when some option narrows the list", () => {
    expect(facetNarrows([{ count: 7 }, { count: 4 }], 7)).toBe(true);
  });
});

describe("imageForColors", () => {
  const imgs = [
    { url: "w", alt: "w", color: "White" },
    { url: "b", alt: "b", color: "Black" },
    { url: "p", alt: "p", color: "Light Pink" },
  ];
  it("returns the first photo of any filtered colour", () => {
    expect(imageForColors(imgs, ["Light Pink", "Black"])).toMatchObject({ image: { url: "b" }, color: "Black" });
  });
  it("falls back to the first photo when no colour matches or none is filtered", () => {
    expect(imageForColors(imgs, ["Red"])).toMatchObject({ image: { url: "w" }, color: null });
    expect(imageForColors(imgs, undefined)).toMatchObject({ image: { url: "w" }, color: null });
    expect(imageForColors([], ["Black"])).toEqual({ image: null, color: null });
  });
});
