/**
 * Per-colour reference photos (data/catalog/color_media.json, built by scripts/build_color_media.py).
 * Seed input only: used when DEMO_USE_REFERENCE_IMAGES=true (AGENTS.md rule 10).
 */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import type { ProductImage } from "@/lib/contracts";

export interface ProductColorMedia {
  /** Colour name (as in products.json `colors`) -> ordered photo URLs. */
  colors: Record<string, string[]>;
  /** Colour-neutral photos (detail shots), shown after the colour's own photos. */
  shared: string[];
}

export type ColorMediaMap = Record<string, ProductColorMedia>;

export interface ImageSource {
  slug: string;
  name: string;
  model_code: string;
  colors: string[];
  reference_image_url: string | null;
}

const DEFAULT_FILE = path.join(process.cwd(), "data/catalog/color_media.json");

export function loadColorMedia(file: string = DEFAULT_FILE): ColorMediaMap {
  if (!existsSync(file)) return {};
  const json = JSON.parse(readFileSync(file, "utf8")) as { products?: ColorMediaMap };
  return json.products ?? {};
}

const fileName = (url: string): string => url.split("?")[0].split("/").pop() ?? url;

/** The colour whose photos contain the product's main reference photo; falls back to the first colour. */
function leadColor(product: ImageSource, media: ProductColorMedia): string | undefined {
  const ref = product.reference_image_url ? fileName(product.reference_image_url) : null;
  const match = ref ? product.colors.find((c) => (media.colors[c] ?? []).some((u) => fileName(u) === ref)) : undefined;
  return match ?? product.colors.find((c) => (media.colors[c] ?? []).length > 0);
}

/**
 * Builds the `products.images` column: every photo is tagged with its colour so the PDP gallery and the
 * cart thumbnail follow the selected colour. Neutral photos are repeated per colour (the gallery filters by
 * colour). The lead colour comes first because cards use `images[0]`.
 * Products without per-colour photos fall back to the single reference photo.
 */
export function buildProductImages(product: ImageSource, media: ProductColorMedia | undefined): ProductImage[] {
  const alt = (color?: string): string => [product.name, product.model_code, color].filter(Boolean).join(" ");
  const withPhotos = media ? product.colors.filter((c) => (media.colors[c] ?? []).length > 0) : [];
  if (!media || withPhotos.length === 0) {
    const neutral = media?.shared.length ? media.shared : product.reference_image_url ? [product.reference_image_url] : [];
    return neutral.map((url) => ({ url, alt: alt() }));
  }
  const lead = leadColor(product, media);
  const ordered = lead ? [lead, ...withPhotos.filter((c) => c !== lead)] : withPhotos;
  return ordered.flatMap((color) =>
    [...media.colors[color], ...media.shared.filter((u) => !media.colors[color].includes(u))].map((url) => ({
      url,
      alt: alt(color),
      color,
    })),
  );
}
