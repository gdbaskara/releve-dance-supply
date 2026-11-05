/**
 * Listing facet display helpers (CAT-03). Pure & client-safe.
 * Raw values stay the filter values in the URL; only labels and grouping change here.
 */
import type { FilterFacetOption } from "@/components/store/filter-panel";
import { formatSize, sizeGroup } from "./format";

/** "04-Pink" -> "Pink", "1615-Perfect Pink" -> "Perfect Pink" (source colour codes are noise for shoppers). */
export function colorLabel(raw: string): string {
  const stripped = raw.replace(/^\d+\s*-\s*/, "").trim();
  return stripped || raw;
}

const SIZE_GROUPS = ["toddler", "child", "adult"] as const;
export type SizeGroupKey = (typeof SIZE_GROUPS)[number];

function sizeGroupKey(raw: string): SizeGroupKey | null {
  const g = sizeGroup(raw);
  return g && (SIZE_GROUPS as readonly string[]).includes(g) ? (g as SizeGroupKey) : null;
}

/**
 * Size facet options with a short label ("8.0s (toddler)" -> "8s") and a translated group heading.
 * Apparel sizes (S, M, 8-10 …) have no group. Labels that would still collide inside one group keep the raw value.
 */
export function sizeOptions(
  options: readonly { value: string; count: number }[],
  groupLabel: (group: SizeGroupKey) => string,
): FilterFacetOption[] {
  const withGroup = options.map((o) => ({ ...o, key: sizeGroupKey(o.value), short: formatSize(o.value) }));
  return withGroup.map((o) => {
    const clash = withGroup.some((x) => x !== o && x.key === o.key && x.short === o.short);
    return {
      value: o.value,
      label: clash ? o.value : o.short,
      count: o.count,
      group: o.key ? groupLabel(o.key) : undefined,
    };
  });
}

/** True when picking some option would actually shrink the list (0 < count < total). */
export function facetNarrows(options: readonly { count: number }[], total: number): boolean {
  return options.some((o) => o.count > 0 && o.count < total);
}
