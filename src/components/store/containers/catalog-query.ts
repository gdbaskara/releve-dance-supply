/**
 * Server-side listing query (CAT-02/03/04): query string → CatalogFilters, catalog + facet labels.
 * Server-only (calls the catalog service).
 */
import { getCatalog } from "@/lib/services/catalog";
import type { Audience, CatalogFilters, CatalogResult, Discipline, SortKey } from "@/lib/contracts";
import type { FilterFacet, FilterSelection } from "@/components/store/filter-panel";
import { FILTER_KEYS, PRICE_BUCKETS, formatSize, priceRangeFor, sizeGroup, type CollectionDef } from "./format";

export const PAGE_SIZE = 24;
const SORTS: SortKey[] = ["newest", "price_asc", "price_desc"];

type SP = Record<string, string | string[] | undefined>;

function list(sp: SP, key: string): string[] {
  const raw = sp[key];
  const joined = Array.isArray(raw) ? raw.join(",") : (raw ?? "");
  return joined.split(",").map((s) => s.trim()).filter(Boolean);
}

export interface ParsedQuery {
  selected: FilterSelection;
  sort: SortKey;
  page: number;
  q: string;
}

export function parseQuery(sp: SP): ParsedQuery {
  const selected: FilterSelection = {};
  for (const k of FILTER_KEYS) {
    const v = list(sp, k);
    if (v.length) selected[k] = v;
  }
  const s = (Array.isArray(sp.sort) ? sp.sort[0] : sp.sort) as SortKey | undefined;
  const p = Number(Array.isArray(sp.page) ? sp.page[0] : sp.page);
  const q = (Array.isArray(sp.q) ? sp.q[0] : sp.q) ?? "";
  return {
    selected,
    sort: s && SORTS.includes(s) ? s : "newest",
    page: Number.isFinite(p) && p >= 1 ? Math.min(Math.floor(p), 20) : 1,
    q: q.slice(0, 80),
  };
}

/** Selection → service filters, within the collection's base filters. */
export function toFilters(col: CollectionDef | null, sel: FilterSelection, extra: Partial<CatalogFilters> = {}): CatalogFilters {
  const baseD = col?.base.disciplines;
  const chosenD = (sel.discipline ?? []) as Discipline[];
  const disciplines = chosenD.length ? (baseD ? chosenD.filter((d) => baseD.includes(d)) : chosenD) : baseD;
  const availability = (sel.availability ?? []).filter((a): a is "READY" | "PREORDER" => a === "READY" || a === "PREORDER");
  return {
    disciplines: disciplines?.length ? disciplines : baseD,
    audience: col?.base.audience ?? ((sel.audience?.length ? sel.audience : undefined) as Audience[] | undefined),
    sizes: sel.size,
    widths: sel.width,
    colors: sel.color,
    availability: availability.length ? availability : undefined,
    ...priceRangeFor(sel.price ?? []),
    ...extra,
  };
}

export interface ListingData {
  result: CatalogResult;
  facets: FilterFacet[];
  shown: number;
}

export interface FacetLabels {
  facet: (key: "discipline" | "audience" | "size" | "width" | "color" | "price" | "availability") => string;
  discipline: (d: string) => string;
  audience: (a: string) => string;
  price: (key: string) => string;
  availability: (a: string) => string;
}

/** Display labels for raw sizes; colliding short labels (e.g. "3" adult vs child) get their group. */
function sizeLabels(values: string[]): Map<string, string> {
  const short = values.map((v) => formatSize(v));
  return new Map(
    values.map((v, i) => {
      const dup = short.filter((s) => s === short[i]).length > 1;
      const g = sizeGroup(v);
      return [v, dup && g ? `${short[i]} (${g})` : short[i]];
    }),
  );
}

export async function loadListing(
  col: CollectionDef | null,
  query: ParsedQuery,
  labels: FacetLabels,
  opts: { showDiscipline: boolean; showAudience: boolean },
): Promise<ListingData> {
  const { selected, sort, page, q } = query;
  const base = toFilters(col, selected, { q: q || undefined });
  const withoutPrice = toFilters(col, { ...selected, price: [] }, { q: q || undefined });
  const withoutAvail = toFilters(col, { ...selected, availability: [] }, { q: q || undefined });

  const [result, priceCounts, availCounts] = await Promise.all([
    getCatalog({ ...base, sort, page: 1, pageSize: PAGE_SIZE * page }),
    Promise.all(
      PRICE_BUCKETS.map((b) =>
        getCatalog({ ...withoutPrice, ...priceRangeFor([b.key]), pageSize: 1 }).then((r) => ({ value: b.key, count: r.total })),
      ),
    ),
    Promise.all(
      (["READY", "PREORDER"] as const).map((a) =>
        getCatalog({ ...withoutAvail, availability: [a], pageSize: 1 }).then((r) => ({ value: a, count: r.total })),
      ),
    ),
  ]);

  const f = result.facets;
  const facets: FilterFacet[] = [];
  if (opts.showDiscipline) {
    const allowed = col?.base.disciplines;
    facets.push({
      key: "discipline",
      label: labels.facet("discipline"),
      kind: "checkbox",
      options: f.discipline
        .filter((o) => !allowed || allowed.includes(o.value as Discipline))
        .map((o) => ({ value: o.value, label: labels.discipline(o.value), count: o.count })),
    });
  }
  if (opts.showAudience && f.audience.length > 1) {
    facets.push({
      key: "audience",
      label: labels.facet("audience"),
      kind: "checkbox",
      options: f.audience.map((o) => ({ value: o.value, label: labels.audience(o.value), count: o.count })),
    });
  }
  facets.push({
    key: "availability",
    label: labels.facet("availability"),
    kind: "checkbox",
    options: availCounts.map((o) => ({ ...o, label: labels.availability(o.value) })),
  });
  if (f.size.length) {
    const sl = sizeLabels(f.size.map((o) => o.value));
    facets.push({
      key: "size",
      label: labels.facet("size"),
      kind: "chips",
      options: f.size.map((o) => ({ value: o.value, label: sl.get(o.value), count: o.count })),
    });
  }
  if (f.width.length) {
    facets.push({ key: "width", label: labels.facet("width"), kind: "chips", options: f.width.map((o) => ({ ...o })) });
  }
  if (f.color.length) {
    facets.push({ key: "color", label: labels.facet("color"), kind: "swatch", options: f.color.map((o) => ({ ...o })) });
  }
  facets.push({
    key: "price",
    label: labels.facet("price"),
    kind: "checkbox",
    options: priceCounts.map((o) => ({ ...o, label: labels.price(o.value) })),
  });

  return { result, facets, shown: result.items.length };
}
