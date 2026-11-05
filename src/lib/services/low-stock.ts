/**
 * Low-stock alert rules (STK-09). Pure & client-safe.
 * An alert fires only when a change CROSSES a boundary, so a busy variant does not message the admin on every sale:
 *   LOW: available goes from above the threshold into 1..threshold
 *   OUT: available goes from > 0 to 0 (wins over LOW when one change skips the low band)
 */
export interface StockChange {
  sku: string;
  /** available (on_hand - reserved) before the change */
  before: number;
  /** available after the change */
  after: number;
}

export type StockAlertKind = "LOW" | "OUT";

export interface StockAlert {
  sku: string;
  kind: StockAlertKind;
  available: number;
}

export function detectStockAlerts(changes: readonly StockChange[], threshold: number): StockAlert[] {
  return changes.flatMap(({ sku, before, after }): StockAlert[] => {
    if (before > 0 && after <= 0) return [{ sku, kind: "OUT", available: 0 }];
    if (before > threshold && after > 0 && after <= threshold) return [{ sku, kind: "LOW", available: after }];
    return [];
  });
}

/** https://wa.me link that opens a chat with `to` and a prefilled message (used by the admin outbox). */
export function waMeLink(to: string, text: string): string {
  return `https://wa.me/${to.replace(/\D/g, "")}?text=${encodeURIComponent(text)}`;
}
