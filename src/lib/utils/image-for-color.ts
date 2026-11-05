import type { ProductImage } from "@/lib/contracts";

/** First photo of the given colour; falls back to the product's first photo (or null when there is none). */
export function imageForColor(images: readonly ProductImage[], color: string | null | undefined): ProductImage | null {
  const match = color ? images.find((i) => i.color === color) : undefined;
  return match ?? images[0] ?? null;
}
