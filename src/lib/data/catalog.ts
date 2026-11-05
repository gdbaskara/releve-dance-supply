/**
 * Loader for data/catalog/products.json (seed input only — the app reads the catalog from Postgres).
 * Uses fs so the 1 MB file is never bundled into the app. Sizes are cleaned with normalizeRawSize (source typos).
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import type { Audience, Discipline, PriceGroup, VariantOption } from "@/lib/contracts";
import { normalizeRawSize } from "./size-normalize";

export interface RawVariant {
  sku: string;
  color: string | null;
  size: string | null;
  width: string | null;
  shank: string | null;
  stock_qty: number;
  stock_status: "READY" | "LOW" | "PREORDER" | "SOLD_OUT";
  preorder_lead_weeks: string | null;
  weight_grams: number;
}

export interface RawProduct {
  id: string;
  slug: string;
  model_code: string;
  name: string;
  brand: string;
  discipline: Discipline;
  audience: Audience;
  pricing: { group: PriceGroup; msrp_usd: number; landed_cost_idr: number; price_idr: number };
  price_idr: number;
  options: VariantOption[];
  colors: string[];
  widths: string[];
  description_en_source: string;
  reference_image_url: string | null;
  variants: RawVariant[];
}

export function loadRawCatalog(file = path.join(process.cwd(), "data/catalog/products.json")): RawProduct[] {
  const json = JSON.parse(readFileSync(file, "utf8")) as { products: RawProduct[] };
  return json.products.map((p) => ({
    ...p,
    variants: p.variants.map((v) => ({ ...v, size: normalizeRawSize(v.size) })),
  }));
}
