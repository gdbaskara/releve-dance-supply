import { describe, expect, it } from "vitest";
import { loadRawCatalog } from "@/lib/data/catalog";
import { buildProductImages, loadColorMedia, type ImageSource, type ProductColorMedia } from "@/lib/data/color-media";
import { imageForColor } from "@/lib/utils/image-for-color";
import { isLightSwatch, relativeLuminance, swatchBackground } from "@/components/store/swatch-colors";

const CDN = "https://cdn.shopify.com/s/files/1/0525/4542/1474/files/";

const product: ImageSource = {
  slug: "briar-sd110l",
  name: "Briar",
  model_code: "SD110L",
  colors: ["Black", "Pink 40", "Sand"],
  reference_image_url: `${CDN}SD110-Pink40.jpg?v=1`,
};

const media: ProductColorMedia = {
  colors: {
    Black: [`${CDN}SD110-Black.jpg`],
    "Pink 40": [`${CDN}SD110-Pink40.jpg`, `${CDN}SD110-Pink40-2.jpg`],
    Sand: [`${CDN}SD110-Sand.jpg`],
  },
  shared: [`${CDN}SD110-sole.jpg`],
};

describe("buildProductImages", () => {
  it("tags every photo with its colour and puts the reference colour first", () => {
    const images = buildProductImages(product, media);
    expect(images[0]).toEqual({ url: `${CDN}SD110-Pink40.jpg`, alt: "Briar SD110L Pink 40", color: "Pink 40" });
    expect(images.every((i) => i.color)).toBe(true);
    expect(images.filter((i) => i.color === "Black").map((i) => i.url)).toEqual([`${CDN}SD110-Black.jpg`, `${CDN}SD110-sole.jpg`]);
  });

  it("appends neutral photos once per colour, after the colour's own photos", () => {
    const pink = buildProductImages(product, media).filter((i) => i.color === "Pink 40");
    expect(pink.map((i) => i.url)).toEqual([`${CDN}SD110-Pink40.jpg`, `${CDN}SD110-Pink40-2.jpg`, `${CDN}SD110-sole.jpg`]);
  });

  it("skips colours without photos and falls back to the first colour that has some", () => {
    const partial: ProductColorMedia = { colors: { Sand: [`${CDN}SD110-Sand.jpg`] }, shared: [] };
    const images = buildProductImages({ ...product, reference_image_url: null }, partial);
    expect(images).toEqual([{ url: `${CDN}SD110-Sand.jpg`, alt: "Briar SD110L Sand", color: "Sand" }]);
  });

  it("falls back to the single reference photo when there is no per-colour media", () => {
    expect(buildProductImages(product, undefined)).toEqual([{ url: product.reference_image_url, alt: "Briar SD110L" }]);
    expect(buildProductImages({ ...product, reference_image_url: null }, undefined)).toEqual([]);
  });

  it("does not mutate its inputs", () => {
    const frozen = JSON.parse(JSON.stringify(media)) as ProductColorMedia;
    buildProductImages(product, media);
    expect(media).toEqual(frozen);
  });
});

describe("imageForColor", () => {
  const images = buildProductImages(product, media);
  it("returns the first photo of the requested colour", () => {
    expect(imageForColor(images, "Sand")?.url).toBe(`${CDN}SD110-Sand.jpg`);
  });
  it("falls back to the first photo for an unknown or missing colour", () => {
    expect(imageForColor(images, "Red")?.url).toBe(images[0].url);
    expect(imageForColor(images, null)?.url).toBe(images[0].url);
  });
  it("returns null when there are no photos", () => {
    expect(imageForColor([], "Sand")).toBeNull();
  });
});

describe("swatch colours", () => {
  it("computes WCAG relative luminance", () => {
    expect(relativeLuminance("#FFFFFF")).toBeCloseTo(1, 5);
    expect(relativeLuminance("#000000")).toBe(0);
  });
  it("flags light fills for a stronger border", () => {
    expect(isLightSwatch("White")).toBe(true);
    expect(isLightSwatch("Light Pink")).toBe(true);
    expect(isLightSwatch("Black")).toBe(false);
    expect(isLightSwatch("Sparkle Silver")).toBe(true);
    expect(isLightSwatch("Unknown colour")).toBe(true);
  });
  it("keeps a two-tone fill for Black-White", () => {
    expect(swatchBackground("Black-White")).toContain("linear-gradient");
  });
});

describe("catalog data", () => {
  const catalog = loadRawCatalog();
  const colorMedia = loadColorMedia();

  it("has a swatch fill for every catalog colour", () => {
    const fallback = swatchBackground("__none__");
    const missing = catalog.flatMap((p) => p.colors.filter((c) => swatchBackground(c) === fallback));
    expect(missing).toEqual([]);
  });

  it("has at least one photo for every catalog colour", () => {
    const missing = catalog.flatMap((p) => p.colors.filter((c) => !(colorMedia[p.slug]?.colors[c]?.length)).map((c) => `${p.slug}:${c}`));
    expect(missing).toEqual([]);
  });

  it("only references the Shopify CDN host allowed in next.config", () => {
    const urls = Object.values(colorMedia).flatMap((m) => [...Object.values(m.colors).flat(), ...m.shared]);
    expect(urls.length).toBeGreaterThan(0);
    expect(urls.every((u) => u.startsWith("https://cdn.shopify.com/"))).toBe(true);
  });
});
