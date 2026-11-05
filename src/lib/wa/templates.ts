/**
 * WhatsApp notification templates (store → buyer), docs/05 §6. Pure & client-safe
 * (the admin outbox can render previews). Placeholders: {name}. Unknown placeholders are left empty.
 */
import type { Locale, MessageTemplate } from "@/lib/contracts";

export const NOTIFICATION_TEMPLATES: Record<MessageTemplate, Record<Locale, string>> = {
  ORDER_CREATED: {
    id: "Terima kasih, {name}! Pesanan {order_no} sebesar {total} menunggu pembayaran via {method} sampai {expires}. Bayar: {pay_url}",
    en: "Thank you, {name}! Order {order_no} for {total} is awaiting payment via {method} until {expires}. Pay: {pay_url}",
  },
  PAYMENT_PAID: {
    id: "Pembayaran {order_no} sebesar {total} sudah kami terima. Pesanan sedang kami siapkan. Lacak: {track_url}",
    en: "We have received your payment of {total} for {order_no}. We are preparing your order. Track: {track_url}",
  },
  PAYMENT_EXPIRED: {
    id: "Pembayaran {order_no} sudah kedaluwarsa dan stok dilepas. Mau pesan lagi? {shop_url}",
    en: "The payment for {order_no} has expired and the stock was released. Want to order again? {shop_url}",
  },
  ORDER_SHIPPED: {
    id: "Pesanan {order_no} sudah dikirim via {courier}, resi {awb}. Lacak: {track_url}",
    en: "Order {order_no} has been shipped via {courier}, tracking number {awb}. Track: {track_url}",
  },
  ORDER_DELIVERED: {
    id: "Pesanan {order_no} sudah sampai. Semoga cocok di kaki! Ada kendala ukuran? Balas pesan ini.",
    en: "Order {order_no} has been delivered. We hope it fits perfectly! Any sizing issue? Just reply to this message.",
  },
  BACK_IN_STOCK: {
    id: "Kabar baik! {name} {variant} sudah ready lagi. Pesan sekarang: {url}",
    en: "Good news! {name} {variant} is back in stock. Order now: {url}",
  },
  PAYMENT_INSTRUCTIONS: {
    id: "Instruksi bayar {order_no}: {method} {va_or_qr_hint}, total {total}, batas {expires}.",
    en: "Payment instructions for {order_no}: {method} {va_or_qr_hint}, total {total}, due {expires}.",
  },
  // Store -> admin (not a buyer): sent when a variant crosses into the low-stock band or sells out.
  LOW_STOCK_ALERT: {
    id: "{state}: {product} ({code}) {variant}, sisa {available}. Restock: {admin_url}",
    en: "{state}: {product} ({code}) {variant}, {available} left. Restock: {admin_url}",
  },
};

export function fillTemplate(template: string, vars: Record<string, string | number | undefined>): string {
  return template
    .replace(/\{(\w+)\}/g, (_, key: string) => {
      const v = vars[key];
      return v === undefined || v === null ? "" : String(v);
    })
    .replace(/[ \t]{2,}/g, " ")
    .replace(/ ([,.])/g, "$1")
    .trim();
}

export function renderNotification(
  template: MessageTemplate,
  locale: Locale,
  vars: Record<string, string | number | undefined>,
): string {
  return fillTemplate(NOTIFICATION_TEMPLATES[template][locale], vars);
}
