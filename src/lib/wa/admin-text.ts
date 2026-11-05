/**
 * Admin -> buyer WhatsApp texts (D-26: WA copy lives in code, not in messages/*). Written in the BUYER's language
 * (order / checkout-link locale), independent of the admin UI language. Pure & client-safe.
 */
import type { Locale } from "@/lib/contracts";
import { fillTemplate } from "./templates";

const ORDER_CHAT: Record<Locale, string> = {
  id: "Halo {name}, kami dari Relevé Dance Supply terkait pesanan {order_no}.",
  en: "Hi {name}, this is Relevé Dance Supply about your order {order_no}.",
};

const CHECKOUT_LINK_SHARE: Record<Locale, string> = {
  id: "Halo {name}, ini link checkout pesanan kamu dari Relevé Dance Supply (berlaku 48 jam): {url}",
  en: "Hi {name}, here is your checkout link from Relevé Dance Supply (valid for 48 hours): {url}",
};

/** Opening line when the admin starts a chat about an order. */
export function orderChatText(locale: Locale, vars: { name: string; orderNo: string }): string {
  return fillTemplate(ORDER_CHAT[locale], { name: vars.name, order_no: vars.orderNo });
}

/** Message that carries a checkout link; an empty name yields "Halo, ..." / "Hi, ...". */
export function checkoutLinkShareText(locale: Locale, vars: { name?: string; url: string }): string {
  return fillTemplate(CHECKOUT_LINK_SHARE[locale], { name: vars.name?.trim() || undefined, url: vars.url });
}
