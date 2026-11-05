/**
 * Catalog service (CAT-*, PDP-*). Server-only.
 * The demo catalog is small (40 products / ~2.9k variants), so we load products + variants once per call
 * and filter/facet in memory — always fresh stock, no caching (D-18).
 */
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { products, variants } from "@/db/schema";
import { firstImageByDiscipline, pickHeroImage, type DisciplineImages } from "./home-images";

import {
  aggregateStockStatus,
  deriveStockStatus,
  type Audience,
  type CatalogFilters,
  type CatalogResult,
  type Discipline,
  type Facet,
  type PriceGroup,
  type ProductDetail,
  type ProductImage,
  type ProductSummary,
  type StockStatus,
  type VariantOption,
  type VariantView,
} from "@/lib/contracts";
import { imageForColors } from "@/lib/utils/image-for-color";
import { maybeSweepExpiredOrders } from "./expiry";

/** Disciplines the home hero photo is taken from, in order of preference. */
const HERO_DISCIPLINES = ["Pointe", "Ballet"] as const;

type ProductRow = typeof products.$inferSelect;
type VariantRow = typeof variants.$inferSelect;

interface LoadedProduct {
  row: ProductRow;
  variants: VariantView[];
  summary: ProductSummary;
}

export const DEFAULT_PAGE_SIZE = 24;

export function toVariantView(v: VariantRow): VariantView {
  const available = Math.max(0, v.onHand - v.reserved);
  return {
    sku: v.sku,
    color: v.color,
    size: v.size,
    width: v.width,
    shank: v.shank,
    available,
    status: deriveStockStatus(available, v.preorderEnabled),
    preorderLeadWeeks: v.preorderEnabled ? v.preorderLeadWeeks : null,
    weightGrams: v.weightGrams,
  };
}

function toSummary(p: ProductRow, vs: VariantView[]): ProductSummary {
  const images = (p.images ?? []) as ProductImage[];
  return {
    id: p.id,
    slug: p.id,
    modelCode: p.modelCode,
    name: p.name,
    brand: p.brand,
    discipline: p.discipline as Discipline,
    audience: p.audience as Audience,
    priceIdr: p.priceIdr,
    colors: p.colors,
    status: aggregateStockStatus(vs.map((v) => v.status)),
    image: images[0] ?? null,
  };
}

async function loadAll(): Promise<LoadedProduct[]> {
  const [ps, vs] = await Promise.all([
    db.select().from(products).where(eq(products.isActive, true)).orderBy(asc(products.sortOrder)),
    db.select().from(variants).orderBy(asc(variants.productId), asc(variants.sortOrder)),
  ]);
  const byProduct = new Map<string, VariantView[]>();
  for (const v of vs) {
    const list = byProduct.get(v.productId) ?? [];
    list.push(toVariantView(v));
    byProduct.set(v.productId, list);
  }
  return ps.map((row) => {
    const pv = byProduct.get(row.id) ?? [];
    return { row, variants: pv, summary: toSummary(row, pv) };
  });
}

/**
 * Size ordering for facets: toddler → child (US kids: 7…13.5 then 1…3.5, then child L sizes) → adult (numeric) →
 * apparel ranges/letters. Raw values come straight from data/catalog (e.g. "7.5L (adult)", "8.0s (toddler)").
 */
const LETTER_SIZES = ["4-6", "6x-7", "8-10", "12-14", "Y-Jr.", "XS", "S", "S-M", "M", "L", "L-XL", "XL", "2XL", "2XL-3XL", "3XL", "4XL"];
function sizeKey(s: string): [number, number] {
  const n = parseFloat(s);
  const letter = LETTER_SIZES.indexOf(s);
  if (letter !== -1) return [3, letter];
  if (Number.isNaN(n) || /^\d+-\d+$/.test(s)) return [4, 0];
  if (/toddler/i.test(s)) return [0, n];
  // child "s" scale first (7s … 13.5s, 1s … 3.5s), then child sizes on the L scale (2L … 3.5L)
  if (/child/i.test(s)) return [1, (n >= 7 ? n : n + 20) + (/^\d+(?:\.\d+)?L/.test(s) ? 40 : 0)];
  return [2, n];
}
export function compareSizes(a: string, b: string): number {
  const [ba, na] = sizeKey(a);
  const [bb, nb] = sizeKey(b);
  return ba - bb || na - nb || a.localeCompare(b);
}

type VariantDim = "size" | "width" | "color" | "availability";
type ProductDim = "discipline" | "audience" | "price" | "q";

function normalize(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "");
}

function matchesQuery(p: LoadedProduct, q: string): boolean {
  const terms = q.toLowerCase().split(/\s+/).map(normalize).filter(Boolean);
  if (terms.length === 0) return true;
  const hay = normalize(`${p.row.name} ${p.row.modelCode} ${p.row.discipline}`);
  return terms.every((t) => hay.includes(t));
}

function productMatches(p: LoadedProduct, f: CatalogFilters, skip?: ProductDim): boolean {
  if (skip !== "discipline" && f.disciplines?.length && !f.disciplines.includes(p.summary.discipline)) return false;
  if (skip !== "audience" && f.audience?.length && !f.audience.includes(p.summary.audience)) return false;
  if (skip !== "price") {
    if (f.minPrice !== undefined && p.row.priceIdr < f.minPrice) return false;
    if (f.maxPrice !== undefined && p.row.priceIdr > f.maxPrice) return false;
  }
  if (skip !== "q" && f.q && !matchesQuery(p, f.q)) return false;
  return true;
}

function variantMatches(v: VariantView, f: CatalogFilters, skip?: VariantDim): boolean {
  if (skip !== "size" && f.sizes?.length && !(v.size && f.sizes.includes(v.size))) return false;
  if (skip !== "width" && f.widths?.length && !(v.width && f.widths.includes(v.width))) return false;
  if (skip !== "color" && f.colors?.length && !(v.color && f.colors.includes(v.color))) return false;
  if (skip !== "availability" && f.availability?.length) {
    const avail: "READY" | "PREORDER" | null =
      v.status === "READY" || v.status === "LOW" ? "READY" : v.status === "PREORDER" ? "PREORDER" : null;
    if (!avail || !f.availability.includes(avail)) return false;
  }
  return true;
}

function hasVariantFilters(f: CatalogFilters): boolean {
  return !!(f.sizes?.length || f.widths?.length || f.colors?.length || f.availability?.length);
}

function matches(p: LoadedProduct, f: CatalogFilters, skip?: ProductDim | VariantDim): boolean {
  if (!productMatches(p, f, skip as ProductDim)) return false;
  if (!hasVariantFilters(f)) return true;
  return p.variants.some((v) => variantMatches(v, f, skip as VariantDim));
}

function countFacet(list: LoadedProduct[], f: CatalogFilters, dim: ProductDim | VariantDim, values: (p: LoadedProduct) => Iterable<string>): Facet[] {
  const counts = new Map<string, number>();
  for (const p of list) {
    if (!matches(p, f, dim)) continue;
    for (const val of new Set(values(p))) counts.set(val, (counts.get(val) ?? 0) + 1);
  }
  return [...counts.entries()].map(([value, count]) => ({ value, count }));
}

/** Variant values of a product that satisfy the *other* variant filters (so facets combine correctly). */
function variantValues(p: LoadedProduct, f: CatalogFilters, dim: "size" | "width" | "color"): string[] {
  return p.variants.filter((v) => variantMatches(v, f, dim)).map((v) => v[dim]).filter((x): x is string => !!x);
}

const DISCIPLINE_ORDER: Discipline[] = [
  "Ballet", "Pointe", "Jazz", "Tap", "Character", "Latin/Ballroom", "Contemporary", "Leotards", "Skirts", "Tops", "Tights",
];
const AUDIENCE_ORDER: Audience[] = ["Adult", "Kids", "Men"];
/** Width letters (A narrowest … EE widest), then the word scale. */
const WIDTH_ORDER = ["A", "B", "C", "D", "E", "EE", "Narrow", "Medium", "Wide"];
function compareWidths(a: string, b: string): number {
  const rank = (w: string) => (WIDTH_ORDER.includes(w) ? WIDTH_ORDER.indexOf(w) : -1);
  return rank(a) - rank(b) || a.localeCompare(b);
}

/** With a colour filter the card shows a photo of a matching colour instead of the lead colour. */
function listingSummary(p: LoadedProduct, colors: readonly string[] | undefined): ProductSummary {
  if (!colors?.length) return p.summary;
  const { image, color } = imageForColors((p.row.images ?? []) as ProductImage[], colors);
  const matchedColor = color ?? p.variants.find((v) => v.color && colors.includes(v.color))?.color ?? null;
  return { ...p.summary, image, matchedColor };
}

export async function getCatalog(filters: CatalogFilters = {}): Promise<CatalogResult> {
  const all = await loadAll();
  const pageSize = Math.min(Math.max(filters.pageSize ?? DEFAULT_PAGE_SIZE, 1), 100);
  const page = Math.max(1, Math.floor(filters.page ?? 1));
  const matched = all.filter((p) => matches(p, filters));

  const sort = filters.sort ?? "newest";
  matched.sort((a, b) => {
    if (sort === "price_asc") return a.row.priceIdr - b.row.priceIdr || a.row.sortOrder - b.row.sortOrder;
    if (sort === "price_desc") return b.row.priceIdr - a.row.priceIdr || a.row.sortOrder - b.row.sortOrder;
    return a.row.sortOrder - b.row.sortOrder;
  });

  const discipline = countFacet(all, filters, "discipline", (p) => [p.summary.discipline])
    .sort((a, b) => DISCIPLINE_ORDER.indexOf(a.value as Discipline) - DISCIPLINE_ORDER.indexOf(b.value as Discipline));
  const audience = countFacet(all, filters, "audience", (p) => [p.summary.audience])
    .sort((a, b) => AUDIENCE_ORDER.indexOf(a.value as Audience) - AUDIENCE_ORDER.indexOf(b.value as Audience));
  const size = countFacet(all, filters, "size", (p) => variantValues(p, filters, "size")).sort((a, b) => compareSizes(a.value, b.value));
  const width = countFacet(all, filters, "width", (p) => variantValues(p, filters, "width")).sort((a, b) => compareWidths(a.value, b.value));
  const color = countFacet(all, filters, "color", (p) => variantValues(p, filters, "color")).sort((a, b) => a.value.localeCompare(b.value));

  const priceBase = all.filter((p) => matches(p, filters, "price"));
  const prices = (priceBase.length ? priceBase : all).map((p) => p.row.priceIdr);

  return {
    items: matched.slice((page - 1) * pageSize, page * pageSize).map((p) => listingSummary(p, filters.colors)),
    total: matched.length,
    page,
    pageSize,
    facets: { discipline, audience, size, width, color },
    priceRange: { min: prices.length ? Math.min(...prices) : 0, max: prices.length ? Math.max(...prices) : 0 },
  };
}

function toDetail(p: LoadedProduct): ProductDetail {
  return {
    ...p.summary,
    group: p.row.group as PriceGroup,
    options: p.row.options as VariantOption[],
    widths: p.row.widths,
    descriptionEn: p.row.descriptionEn,
    descriptionId: p.row.descriptionId,
    featuresId: p.row.featuresId,
    featuresEn: p.row.featuresEn,
    images: (p.row.images ?? []) as ProductImage[],
    variants: p.variants,
  };
}

export async function getProduct(slug: string): Promise<ProductDetail | null> {
  await maybeSweepExpiredOrders();
  const [row] = await db.select().from(products).where(eq(products.id, slug)).limit(1);
  if (!row || !row.isActive) return null;
  const vs = await db.select().from(variants).where(eq(variants.productId, slug)).orderBy(asc(variants.sortOrder));
  const views = vs.map(toVariantView);
  return toDetail({ row, variants: views, summary: toSummary(row, views) });
}

/** n products from the same discipline (then same price group) — PDP-08 "compare similar". */
export async function getRelated(slug: string, n = 3): Promise<ProductSummary[]> {
  const all = await loadAll();
  const self = all.find((p) => p.row.id === slug);
  if (!self) return [];
  const others = all.filter((p) => p.row.id !== slug);
  const same = others.filter((p) => p.row.discipline === self.row.discipline);
  const group = others.filter((p) => p.row.discipline !== self.row.discipline && p.row.group === self.row.group);
  const rank = (p: LoadedProduct) => (p.summary.status === "SOLD_OUT" ? 1 : 0);
  return [...same.sort((a, b) => rank(a) - rank(b)), ...group.sort((a, b) => rank(a) - rank(b))]
    .slice(0, n)
    .map((p) => p.summary);
}

export interface HomeCollections {
  readyStock: ProductSummary[];
  kids: ProductSummary[];
  /** product count per discipline (for "shop by discipline" tiles) */
  disciplineCounts: Facet[];
  /** first product photo per discipline (hero + tiles); empty when products have no photos */
  disciplineImages: DisciplineImages;
  /** hero photo (a pointe/ballet product other than the tile's), null when products have no photos */
  heroImage: ProductImage | null;
}

/** Home page helpers (CAT-07). readyStock = products with ≥ 1 READY variant (not just LOW), in catalog order. */
export async function getCollections(limit = 8): Promise<HomeCollections> {
  const all = await loadAll();
  const isReady = (s: StockStatus) => s === "READY";
  const imageSources = all.map((p) => ({ discipline: p.row.discipline, image: p.summary.image }));
  return {
    readyStock: all.filter((p) => p.variants.some((v) => isReady(v.status))).slice(0, limit).map((p) => p.summary),
    kids: all.filter((p) => p.row.audience === "Kids").slice(0, limit).map((p) => p.summary),
    disciplineCounts: DISCIPLINE_ORDER.map((d) => ({ value: d, count: all.filter((p) => p.row.discipline === d).length })),
    disciplineImages: firstImageByDiscipline(imageSources),
    heroImage: pickHeroImage(imageSources, HERO_DISCIPLINES),
  };
}
