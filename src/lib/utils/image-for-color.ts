import type { ProductImage } from "@/lib/contracts";

/** First photo of the given colour; falls back to the product's first photo (or null when there is none). */
export function imageForColor(images: readonly ProductImage[], color: string | null | undefined): ProductImage | null {
  const match = color ? images.find((i) => i.color === color) : undefined;
  return match ?? images[0] ?? null;
}

export interface ColorImageMatch {
  image: ProductImage | null;
  /** The filtered colour the photo shows; null when it fell back to the first photo. */
  color: string | null;
}

/** First photo whose colour is one of `colors` (listing colour filter); falls back to the first photo. */
export function imageForColors(images: readonly ProductImage[], colors: readonly string[] | undefined): ColorImageMatch {
  const match = colors?.length ? images.find((i) => !!i.color && colors.includes(i.color)) : undefined;
  if (match) return { image: match, color: match.color ?? null };
  return { image: images[0] ?? null, color: null };
}
