/**
 * Normalise Indonesian mobile numbers to E.164 (+62…). Accepts 08…, 8…, 62…, +62…, with spaces/dashes.
 * Returns null when invalid (9–13 digits after the 62 country code, must start with 8).
 */
export function normalizePhoneID(input: string): string | null {
  let d = (input || "").replace(/[^\d+]/g, "");
  if (d.startsWith("+")) d = d.slice(1);
  d = d.replace(/\D/g, "");
  if (d.startsWith("62")) d = d.slice(2);
  else if (d.startsWith("0")) d = d.slice(1);
  if (!d.startsWith("8")) return null;
  if (d.length < 9 || d.length > 13) return null;
  return `+62${d}`;
}

/** "+6281234567890" → "+62 812-3456-7890" */
export function formatPhoneID(e164: string): string {
  const local = e164.replace(/^\+62/, "");
  const parts = [local.slice(0, 3), local.slice(3, 7), local.slice(7)].filter(Boolean);
  return `+62 ${parts.join("-")}`;
}

/** "+6281234567890" → "+62 812-•••-7890" */
export function maskPhoneID(e164: string): string {
  const local = e164.replace(/^\+62/, "");
  return `+62 ${local.slice(0, 3)}-•••-${local.slice(-4)}`;
}

/** wa.me wants digits only without "+" */
export function toWaMeNumber(e164OrDigits: string): string {
  return e164OrDigits.replace(/\D/g, "");
}
