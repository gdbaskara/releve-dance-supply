/** Integer Rupiah → "Rp 1.250.000" (same format in both locales, NFR-09 / I18N-05). */
export function formatIDR(value: number): string {
  const n = Math.round(value);
  const sign = n < 0 ? "-" : "";
  const digits = Math.abs(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${sign}Rp ${digits}`;
}
