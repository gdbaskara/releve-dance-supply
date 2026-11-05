/**
 * Pure variant-selection logic for VariantPicker (no React). Unit-tested in tests/unit/components.
 *
 * Model: options are resolved in cascade order Color → Size → Width → Shank (as listed in
 * `product.options`). The availability of a value for option N is computed from the variants that match
 * the selections of options 0..N-1 only, so the shopper can always change an earlier option; later
 * selections that no longer exist are dropped by `reconcileSelection`.
 */
import type { ProductDetail, StockStatus, VariantOption, VariantView } from "@/lib/contracts";

export type OptionKey = "color" | "size" | "width" | "shank";
export type Selection = Partial<Record<OptionKey, string>>;

export const OPTION_KEY: Record<VariantOption, OptionKey> = {
  Color: "color",
  Size: "size",
  Width: "width",
  Shank: "shank",
};

export type VariantSource = Pick<ProductDetail, "options" | "variants"> & Partial<Pick<ProductDetail, "colors" | "widths">>;

export interface OptionValueState {
  value: string;
  /** Best status among matching variants; `null` = no variant exists for this combination (disabled). */
  status: StockStatus | null;
  /** Units available across matching variants. */
  available: number;
  /** Pre-order lead weeks of the first matching pre-order variant. */
  leadWeeks: string | null;
}

const RANK: Record<StockStatus, number> = { READY: 3, LOW: 2, PREORDER: 1, SOLD_OUT: 0 };

/** Ordered option keys for a product (e.g. ["color","size","width"]). */
export function optionKeys(product: Pick<ProductDetail, "options">): OptionKey[] {
  return product.options.map((o) => OPTION_KEY[o]);
}

/** Distinct values of an option in display order (product.colors / product.widths when given, else first appearance). */
export function optionValues(product: VariantSource, key: OptionKey): string[] {
  const seen: string[] = [];
  for (const v of product.variants) {
    const x = v[key];
    if (x != null && !seen.includes(x)) seen.push(x);
  }
  const preferred = key === "color" ? product.colors : key === "width" ? product.widths : undefined;
  if (preferred?.length) {
    return [...preferred.filter((p) => seen.includes(p)), ...seen.filter((s) => !preferred.includes(s))];
  }
  return seen;
}

function matches(v: VariantView, sel: Selection, keys: OptionKey[]): boolean {
  return keys.every((k) => sel[k] === undefined || v[k] === sel[k]);
}

/** Availability of every value of `key`, given the selections of the options before it. */
export function optionValueStates(product: VariantSource, key: OptionKey, selection: Selection): OptionValueState[] {
  const keys = optionKeys(product);
  const before = keys.slice(0, keys.indexOf(key));
  const pool = product.variants.filter((v) => matches(v, selection, before));
  return optionValues(product, key).map((value) => {
    const vs = pool.filter((v) => v[key] === value);
    if (vs.length === 0) return { value, status: null, available: 0, leadWeeks: null };
    let best: StockStatus = "SOLD_OUT";
    let available = 0;
    let leadWeeks: string | null = null;
    for (const v of vs) {
      if (RANK[v.status] > RANK[best]) best = v.status;
      available += Math.max(0, v.available);
      if (v.status === "PREORDER" && !leadWeeks) leadWeeks = v.preorderLeadWeeks;
    }
    return { value, status: best, available, leadWeeks };
  });
}

/**
 * Drops selections that no longer correspond to an existing variant (cascade order) and auto-selects
 * options that have exactly one possible value.
 */
export function reconcileSelection(product: VariantSource, selection: Selection): Selection {
  const keys = optionKeys(product);
  const out: Selection = {};
  for (const k of keys) {
    const states = optionValueStates(product, k, out).filter((s) => s.status !== null);
    const cur = selection[k];
    if (cur !== undefined && states.some((s) => s.value === cur)) out[k] = cur;
    else if (states.length === 1) out[k] = states[0].value;
  }
  return out;
}

export interface VariantState {
  selection: Selection;
  /** Exact variant when every option is selected, else null. */
  variant: VariantView | null;
  sku: string | null;
  complete: boolean;
  /** Options still to choose, in order. */
  missing: OptionKey[];
}

/** Resolve a (possibly partial) selection into the matching variant. */
export function resolveVariant(product: VariantSource, selection: Selection): VariantState {
  const keys = optionKeys(product);
  const sel = reconcileSelection(product, selection);
  const missing = keys.filter((k) => sel[k] === undefined);
  const variant = missing.length === 0 ? (product.variants.find((v) => matches(v, sel, keys)) ?? null) : null;
  return { selection: sel, variant, sku: variant?.sku ?? null, complete: variant !== null, missing };
}

/** "Ballet Pink · 7.5 · M" — the canonical variant label (CartLineView.variantLabel uses the same format). */
export function variantLabel(v: Pick<VariantView, "color" | "size" | "width" | "shank">): string {
  return [v.color, v.size ? splitSize(v.size).short : null, v.width, v.shank].filter(Boolean).join(" · ");
}

/** "7.5L (adult)" → { short: "7.5L", group: "adult" }; "M" → { short: "M", group: null }. */
export function splitSize(size: string): { short: string; group: string | null } {
  const m = /^(.+?)\s*\(([^)]+)\)+\s*$/.exec(size);
  return m ? { short: m[1].trim(), group: m[2].trim().toLowerCase() } : { short: size, group: null };
}
