/**
 * Sends LOW_STOCK_ALERT WhatsApp messages to the store admin (STK-09). Server-only.
 * Recipient: ADMIN_WA_NUMBER, falling back to the store's own WA (NEXT_PUBLIC_WA_NUMBER) so the demo works
 * without extra config. Language: ADMIN_WA_LOCALE (id | en, default id).
 * Run AFTER the stock change committed; never throws (sendMessage logs failures), so a stock or order flow
 * is never broken by a WhatsApp hiccup.
 */
import { eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { products, variants } from "@/db/schema";
import { LOW_STOCK_THRESHOLD, type Locale } from "@/lib/contracts";
import { normalizePhoneID } from "@/lib/format/phone";
import { siteUrl } from "@/lib/providers/env";
import type { DbOrTx } from "./db-types";
import { variantLabel } from "./labels";
import { detectStockAlerts, type StockAlertKind, type StockChange } from "./low-stock";
import { log, sendMessage } from "./notify";

const STATE_TEXT: Record<StockAlertKind, Record<Locale, string>> = {
  LOW: { id: "Stok menipis", en: "Low stock" },
  OUT: { id: "Stok habis", en: "Out of stock" },
};

/** E.164 (+62…) like buyer numbers in the outbox; null when unset or not an Indonesian mobile number. */
export function adminWaNumber(): string | null {
  return normalizePhoneID(process.env.ADMIN_WA_NUMBER || process.env.NEXT_PUBLIC_WA_NUMBER || "");
}

export function adminWaLocale(): Locale {
  return process.env.ADMIN_WA_LOCALE === "en" ? "en" : "id";
}

/** Detects boundary crossings in `changes` and messages the admin once per alert. Returns messages sent. */
export async function notifyLowStock(changes: readonly StockChange[], conn: DbOrTx = db): Promise<number> {
  const alerts = detectStockAlerts(changes, LOW_STOCK_THRESHOLD);
  if (alerts.length === 0) return 0;
  const to = adminWaNumber();
  if (!to) {
    log("stock.alert_skipped", { reason: "no admin WA number", skus: alerts.map((a) => a.sku) });
    return 0;
  }
  const rows = await conn
    .select({
      sku: variants.sku, color: variants.color, size: variants.size, width: variants.width, shank: variants.shank,
      productId: products.id, name: products.name, modelCode: products.modelCode,
    })
    .from(variants)
    .innerJoin(products, eq(products.id, variants.productId))
    .where(inArray(variants.sku, alerts.map((a) => a.sku)));
  const bySku = new Map(rows.map((r) => [r.sku, r]));
  const locale = adminWaLocale();
  let sent = 0;
  for (const a of alerts) {
    const r = bySku.get(a.sku);
    if (!r) continue;
    const ok = await sendMessage(to, "LOW_STOCK_ALERT", locale, {
      state: STATE_TEXT[a.kind][locale],
      product: r.name,
      code: r.modelCode,
      variant: variantLabel(r),
      available: String(a.available),
      admin_url: `${siteUrl()}/admin/products/${r.productId}`,
    });
    if (ok) sent += 1;
  }
  log("stock.alerted", { sent, skus: alerts.map((a) => `${a.sku}:${a.kind}`) });
  return sent;
}
