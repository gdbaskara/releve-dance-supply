/** Pure label helpers (client-safe). */
import type { Locale, PaymentChannel, PaymentMethod } from "@/lib/contracts";

/** "Ballet Pink · 7.5 · M" (+ shank for pointe) — only options the variant has. */
export function variantLabel(v: { color?: string | null; size?: string | null; width?: string | null; shank?: string | null }): string {
  return [v.color, v.size, v.width, v.shank].filter((x): x is string => !!x).join(" · ");
}

const CHANNEL_NAMES: Record<PaymentChannel, string> = {
  GOPAY: "GoPay", OVO: "OVO", DANA: "DANA", SHOPEEPAY: "ShopeePay",
  BCA: "BCA", MANDIRI: "Mandiri", BNI: "BNI", BRI: "BRI", PERMATA: "Permata",
};

export function channelName(channel: PaymentChannel): string {
  return CHANNEL_NAMES[channel];
}

/** Human label used inside WA messages: "QRIS", "GoPay", "Virtual Account BCA", "Kartu kredit/debit". */
export function paymentMethodLabel(method: PaymentMethod, channel: PaymentChannel | null | undefined, locale: Locale): string {
  switch (method) {
    case "QRIS":
      return "QRIS";
    case "EWALLET":
      return channel ? CHANNEL_NAMES[channel] : "E-wallet";
    case "VA":
      return `Virtual Account ${channel ? CHANNEL_NAMES[channel] : ""}`.trim();
    case "CARD":
      return locale === "id" ? "Kartu kredit/debit" : "Credit/debit card";
  }
}
