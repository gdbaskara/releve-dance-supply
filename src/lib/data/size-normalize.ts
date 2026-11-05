/**
 * Cleans raw size strings copied from the source catalog before they reach the database (seed) so facets
 * and the size guide never show the same size twice. Pure & client-safe.
 *   "11.5s (child))" -> "11.5s (child)"   (stray parenthesis)
 *   "6.5 (adult)"    -> "6.5L (adult)"    (adult numeric sizes always carry the L scale letter)
 */
export function normalizeRawSize(raw: string | null | undefined): string | null {
  if (raw == null) return null;
  const trimmed = raw.trim().replace(/\)+$/, ")");
  return trimmed.replace(/^(\d+(?:\.\d+)?)\s+\(adult\)$/, "$1L (adult)");
}
