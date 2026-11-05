/**
 * Size guide tables (PDP-05, Q-06). Pure & client-safe.
 *
 * APPROXIMATE: built from a generic US -> foot-length conversion, not the official Só Dança chart (Q-06 is
 * still open). Every size and width on sale is covered (tests/unit/size-guide-data.test.ts checks this
 * against data/catalog), so a shopper always finds their size in the table.
 *
 * Shoe sizes follow the catalog's raw notation so a row can be matched to the size picked on the PDP:
 *   kids "s" scale   7s … 13.5s, then 1s … 3.5s (toddler up to 9.5s, child from 10s)
 *   "L" scale        2L … 15L (child below 3, adult from 3; pointe also sells child L 3–3.5)
 */
import { formatSize } from "./containers/format";

export type SizeGuideCategory = "balletJazz" | "pointe" | "tapCharacter" | "ballroom" | "dancewear";
export type ShoeGroup = "toddler" | "child" | "adult";

export interface ShoeRow {
  /** Canonical raw size, e.g. "8.5s (toddler)" or "10.0L (adult)". */
  key: string;
  /** Short display label ("8.5s", "10"). */
  label: string;
  group: ShoeGroup;
  /** Foot length in cm (approx.). */
  cm: number;
  /** EU size (approx.). */
  eu: string;
}

/* Kids "s" scale: position on one running scale (7s … 13.5s = 7 … 13.5, then 1s … 3.5s = 14 … 16.5). */
const KIDS_ANCHORS: [pos: number, cm: number, eu: number][] = [
  [8, 15.2, 25],
  [9, 15.9, 26],
  [10, 16.5, 27],
  [11, 17.5, 28],
  [12, 18.4, 30],
  [13, 19.1, 31],
  [14, 19.8, 32],
  [15, 20.6, 33],
  [16, 21.6, 34],
];

function interpolate(pos: number, pick: (a: (typeof KIDS_ANCHORS)[number]) => number): number {
  const first = KIDS_ANCHORS[0];
  const last = KIDS_ANCHORS[KIDS_ANCHORS.length - 1];
  if (pos <= first[0]) {
    const next = KIDS_ANCHORS[1];
    return pick(first) - (first[0] - pos) * (pick(next) - pick(first));
  }
  if (pos >= last[0]) {
    const prev = KIDS_ANCHORS[KIDS_ANCHORS.length - 2];
    return pick(last) + (pos - last[0]) * (pick(last) - pick(prev));
  }
  const i = KIDS_ANCHORS.findIndex((a) => a[0] > pos);
  const [a, b] = [KIDS_ANCHORS[i - 1], KIDS_ANCHORS[i]];
  return pick(a) + ((pos - a[0]) / (b[0] - a[0])) * (pick(b) - pick(a));
}

const round1 = (n: number) => Math.round(n * 10) / 10;
const halfStep = (n: number) => {
  const r = Math.round(n * 2) / 2;
  return Number.isInteger(r) ? String(r) : r.toFixed(1);
};

function kidsRow(pos: number): ShoeRow {
  const us = pos >= 14 ? pos - 13 : pos;
  const group: ShoeGroup = pos < 10 ? "toddler" : "child";
  const key = `${us.toFixed(1)}s (${group})`;
  return { key, label: formatSize(key), group, cm: round1(interpolate(pos, (a) => a[1])), eu: halfStep(interpolate(pos, (a) => a[2])) };
}

/* "L" scale: ~0.85 cm per full size (one Brannock step), anchored at US 4 = 20.8 cm; EU ≈ US + 30.5. */
function lRow(us: number, group: Exclude<ShoeGroup, "toddler">): ShoeRow {
  const key = `${us.toFixed(1)}L (${group})`;
  return { key, label: formatSize(key), group, cm: round1(20.8 + (us - 4) * 0.85), eu: halfStep(us + 30.5) };
}

const steps = (from: number, to: number) => Array.from({ length: Math.round((to - from) * 2) + 1 }, (_, i) => from + i / 2);

interface ShoeRange {
  /** kids "s" scale positions (7 = 7s … 16.5 = 3.5s) */
  kids?: [number, number];
  /** child sizes on the L scale */
  childL?: [number, number];
  adult: [number, number];
}

const SHOE_RANGES: Record<Exclude<SizeGuideCategory, "dancewear">, ShoeRange> = {
  balletJazz: { kids: [8, 16.5], adult: [3, 15] },
  pointe: { kids: [14, 15.5], childL: [2, 3.5], adult: [3, 10.5] },
  tapCharacter: { kids: [7, 13.5], adult: [3, 15] },
  ballroom: { adult: [5, 14.5] },
};

/** Rows for one shoe category: toddler -> child -> adult. */
export function shoeRows(category: Exclude<SizeGuideCategory, "dancewear">): ShoeRow[] {
  const r = SHOE_RANGES[category];
  const kids = r.kids ? steps(r.kids[0], r.kids[1]).map(kidsRow) : [];
  const childL = r.childL ? steps(r.childL[0], r.childL[1]).map((us) => lRow(us, "child")) : [];
  const adult = steps(r.adult[0], r.adult[1]).map((us) => lRow(us, "adult"));
  return [...kids.filter((k) => k.group === "toddler"), ...kids.filter((k) => k.group === "child"), ...childL, ...adult];
}

/** Canonical key for a raw size so it matches a ShoeRow ("10L (adult)" -> "10.0L (adult)"); apparel sizes unchanged. */
export function sizeKey(raw: string): string {
  const m = /^(\d+(?:\.\d+)?)([Ls])\s*\(([^)]+)\)$/.exec(raw.trim());
  if (!m) return raw.trim();
  return `${Number(m[1]).toFixed(1)}${m[2]} (${m[3].trim().toLowerCase()})`;
}

/** Contemporary half-soles / foot thongs (MD22) come in letter sizes: mapped to US shoe size and foot length. */
export interface LetterShoeRow {
  size: string;
  us: string;
  cm: string;
}
export const CONTEMPORARY_ROWS: LetterShoeRow[] = [
  { size: "XS", us: "4–5", cm: "20.8–21.7" },
  { size: "S", us: "5.5–7", cm: "22.1–23.4" },
  { size: "M", us: "7.5–9", cm: "23.8–25.1" },
  { size: "L", us: "9.5–11", cm: "25.5–26.8" },
  { size: "XL", us: "11.5–13", cm: "27.2–28.5" },
];

/* ---------- Widths ---------- */

export type WidthKey = "A" | "B" | "C" | "D" | "E" | "EE" | "Narrow" | "Medium" | "Wide";

const WIDTHS: Record<Exclude<SizeGuideCategory, "dancewear">, WidthKey[]> = {
  balletJazz: ["A", "B", "C", "D", "E", "Narrow", "Medium", "Wide"],
  pointe: ["B", "C", "D", "E", "EE"],
  tapCharacter: ["Medium", "Wide"],
  ballroom: ["Medium", "Wide"],
};

/** Widths explained in a category's tab (empty for dancewear). */
export function widthRows(category: SizeGuideCategory): WidthKey[] {
  return category === "dancewear" ? [] : WIDTHS[category];
}

/* ---------- Dancewear (body measurements, cm / kg) ---------- */

export interface ApparelRow {
  size: string;
  height: string;
  chest: string;
  waist: string;
  hip: string;
}

/** Leotards, tops, skirts: kids sizes first, then adult. */
export const APPAREL_ROWS: ApparelRow[] = [
  { size: "4-6", height: "104–116", chest: "56–61", waist: "53–56", hip: "58–64" },
  { size: "6x-7", height: "116–122", chest: "61–64", waist: "55–57", hip: "64–67" },
  { size: "8-10", height: "128–140", chest: "64–71", waist: "57–61", hip: "67–74" },
  { size: "12-14", height: "146–158", chest: "72–79", waist: "61–65", hip: "76–83" },
  { size: "Y-Jr.", height: "150–156", chest: "74–79", waist: "60–64", hip: "79–84" },
  { size: "XS", height: "150–158", chest: "76–81", waist: "58–63", hip: "81–86" },
  { size: "S", height: "155–163", chest: "81–86", waist: "63–68", hip: "86–91" },
  { size: "M", height: "160–168", chest: "86–91", waist: "68–73", hip: "91–96" },
  { size: "L", height: "165–173", chest: "91–97", waist: "73–79", hip: "96–102" },
  { size: "XL", height: "168–175", chest: "97–103", waist: "79–85", hip: "102–108" },
];

export interface TightsRow {
  size: string;
  height: string;
  weight: string;
}

/** Tights are sized by height and weight. */
export const TIGHTS_ROWS: TightsRow[] = [
  { size: "S-M", height: "150–165", weight: "45–60" },
  { size: "L-XL", height: "163–178", weight: "57–75" },
  { size: "2XL", height: "160–178", weight: "75–90" },
  { size: "2XL-3XL", height: "160–180", weight: "75–100" },
  { size: "3XL", height: "160–180", weight: "88–105" },
  { size: "4XL", height: "160–183", weight: "100–118" },
];

/* ---------- Category of a product ---------- */

/** Which size-guide tab a product opens on (same rule the PDP uses). */
export function guideCategoryFor(discipline: string, group: string): SizeGuideCategory {
  if (group === "apparel" || group === "tights") return "dancewear";
  if (discipline === "Pointe") return "pointe";
  if (discipline === "Tap" || discipline === "Character") return "tapCharacter";
  if (discipline === "Latin/Ballroom") return "ballroom";
  return "balletJazz";
}
