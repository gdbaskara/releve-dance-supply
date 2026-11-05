/** Home page imagery (CAT-07): hero and "shop by discipline" tiles reuse product photos. */
import type { ProductImage } from "@/lib/contracts";

export interface DisciplineImageSource {
  discipline: string;
  image: ProductImage | null;
}

export type DisciplineImages = Readonly<Record<string, ProductImage>>;

/**
 * First product photo per discipline, in catalog order. Empty when products have no photos
 * (DEMO_USE_REFERENCE_IMAGES=false), so the home page keeps its placeholder art.
 */
export function firstImageByDiscipline(items: readonly DisciplineImageSource[]): DisciplineImages {
  return items.reduce<Record<string, ProductImage>>(
    (acc, { discipline, image }) => (image && !acc[discipline] ? { ...acc, [discipline]: image } : acc),
    {},
  );
}

/**
 * Hero photo: from the first listed discipline that has photos, take the second product's photo so it does not
 * repeat the discipline tile right below it on phones; a discipline with a single photo uses that one.
 */
export function pickHeroImage(items: readonly DisciplineImageSource[], disciplines: readonly string[]): ProductImage | null {
  for (const d of disciplines) {
    const photos = items.filter((i) => i.discipline === d && i.image).map((i) => i.image as ProductImage);
    if (photos.length) return photos[1] ?? photos[0];
  }
  return null;
}

/** Photo of the first listed discipline that has one, or null. */
export function pickImage(images: DisciplineImages, disciplines: readonly string[]): ProductImage | null {
  const hit = disciplines.find((d) => images[d]);
  return hit ? images[hit] : null;
}
