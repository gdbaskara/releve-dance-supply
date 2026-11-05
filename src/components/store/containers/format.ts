/**
 * Storefront display helpers (WS-3). Pure & client-safe.
 */
import {
  COLLECTIONS,
  DISCIPLINE_SLUGS,
  type CatalogFilters,
  type Discipline,
  type ProductDetail,
  type VariantView,
} from "@/lib/contracts";

/**
 * Raw size strings from the catalog → short display label (filters still use the raw value).
 * "7.5L (adult)" → "7.5" · "10.0L (adult)" → "10" · "8.0s (toddler)" → "8s" · "11.5s (child))" → "11.5s" · "M" → "M"
 */
export function formatSize(raw: string | null | undefined): string {
  if (!raw) return "";
  const base = raw.replace(/\s*\(.*$/, "").trim();
  const m = /^(\d+(?:\.\d+)?)([Ls]?)$/.exec(base);
  if (!m) return base;
  const num = m[1].replace(/\.0$/, "");
  return m[2] === "s" ? `${num}s` : num;
}

/** "(adult)" → "adult", or null. */
export function sizeGroup(raw: string): string | null {
  const m = /\(([^)]+)\)/.exec(raw);
  return m ? m[1].trim().toLowerCase() : null;
}

/** "Ballet Pink · 7.5 · M" (+ shank) — the label stored in the cart snapshot. */
export function displayVariantLabel(v: Pick<VariantView, "color" | "size" | "width" | "shank">): string {
  return [v.color, v.size ? formatSize(v.size) : null, v.width, v.shank].filter(Boolean).join(" · ");
}

/** Server variant labels carry raw sizes ("Ballet Pink · 7.5L (adult) · M"); prettify the size part. */
export function prettifyVariantLabel(label: string): string {
  return label
    .split(" · ")
    .map((part) => (/^\d+(?:\.\d+)?[Ls]?\s*\(/.test(part) ? formatSize(part) : part))
    .join(" · ");
}

/* ---------- Collections (listing slugs) ---------- */

export type CollectionSlug = keyof typeof DISCIPLINE_SLUGS | "shoes" | "dancewear" | "kids";

export interface CollectionDef {
  slug: string;
  /** Base filters that define the collection (not shown as removable filters). */
  base: Pick<CatalogFilters, "disciplines" | "audience">;
  /** Aggregate collections show a discipline facet. */
  aggregate: boolean;
  /** Fixed audience (kids) → hide the audience facet. */
  fixedAudience: boolean;
  /** Size guide tab hint for this collection. */
  discipline?: Discipline;
}

export const AGGREGATE_SLUGS = ["shoes", "dancewear", "kids"] as const;

export function resolveCollection(slug: string): CollectionDef | null {
  if (slug in DISCIPLINE_SLUGS) {
    const d = DISCIPLINE_SLUGS[slug];
    return { slug, base: { disciplines: [d] }, aggregate: false, fixedAudience: false, discipline: d };
  }
  if (slug === "shoes") return { slug, base: { disciplines: COLLECTIONS.shoes }, aggregate: true, fixedAudience: false };
  if (slug === "dancewear") return { slug, base: { disciplines: COLLECTIONS.dancewear }, aggregate: true, fixedAudience: false };
  if (slug === "kids") return { slug, base: { audience: ["Kids"] }, aggregate: true, fixedAudience: true };
  return null;
}

export const ALL_COLLECTION_SLUGS: string[] = [...Object.keys(DISCIPLINE_SLUGS), ...AGGREGATE_SLUGS];

/** Discipline → listing slug ("Latin/Ballroom" → "latin-ballroom"). */
export function disciplineSlug(d: Discipline): string {
  return Object.entries(DISCIPLINE_SLUGS).find(([, v]) => v === d)?.[0] ?? "shoes";
}

/** Query-string keys of the listing filters (values are comma-separated). */
export const FILTER_KEYS = ["discipline", "audience", "size", "width", "color", "price", "availability"] as const;

/* ---------- Price buckets (CAT-03 price range) ---------- */

export const PRICE_BUCKETS = [
  { key: "under1m", min: 0, max: 999_999 },
  { key: "1m-2m", min: 1_000_000, max: 1_999_999 },
  { key: "2m-3m", min: 2_000_000, max: 2_999_999 },
  { key: "over3m", min: 3_000_000, max: undefined },
] as const;
export type PriceBucketKey = (typeof PRICE_BUCKETS)[number]["key"];

/** Union of selected buckets → one min/max range. */
export function priceRangeFor(keys: string[]): { minPrice?: number; maxPrice?: number } {
  const sel = PRICE_BUCKETS.filter((b) => keys.includes(b.key));
  if (sel.length === 0) return {};
  const min = Math.min(...sel.map((b) => b.min));
  const max = sel.some((b) => b.max === undefined) ? undefined : Math.max(...sel.map((b) => b.max as number));
  return { minPrice: min || undefined, maxPrice: max };
}

/* ---------- PDP comparison helpers ---------- */

type CopySource = Pick<ProductDetail, "group" | "descriptionEn" | "featuresEn" | "featuresId">;

export type SoleKey = "split" | "full" | "suede" | "rubber" | "pointe" | "unknown";

export function soleOf(p: CopySource): SoleKey {
  if (p.group === "pointe") return "pointe";
  const src = `${p.descriptionEn} ${p.featuresEn.join(" ")}`;
  if (/split[- ]sole/i.test(src)) return "split";
  if (/full[- ]sole/i.test(src)) return "full";
  if (/suede/i.test(src)) return "suede";
  if (/rubber/i.test(src)) return "rubber";
  return "unknown";
}

/** "Material: stretch canvas" feature bullet → "stretch canvas" (locale-specific list). */
export function materialOf(p: CopySource, locale: "id" | "en"): string | null {
  const list = locale === "id" ? p.featuresId : p.featuresEn;
  const f = list.find((x) => /^Material:/i.test(x));
  return f ? f.replace(/^Material:\s*/i, "") : null;
}

/* ---------- Info pages ---------- */

export const INFO_SLUGS = ["shipping", "payment", "faq", "terms", "privacy", "about"] as const;
export type InfoSlug = (typeof INFO_SLUGS)[number];
