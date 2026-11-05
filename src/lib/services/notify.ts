/**
 * Messaging helpers: build template vars & send through the configured MessagingProvider.
 * Failures are logged, never thrown — a WhatsApp hiccup must not break an order flow.
 */
import type { Locale, MessageTemplate, PaymentChannel, PaymentMethod } from "@/lib/contracts";
import { formatDateTimeWIB, formatIDR } from "@/lib/format";
import { getMessagingProvider } from "@/lib/providers";
import { siteUrl } from "@/lib/providers/env";
import { paymentMethodLabel } from "./labels";

export const urls = {
  pay: (locale: Locale, orderNo: string) => `${siteUrl()}/${locale}/pay/${orderNo}`,
  success: (locale: Locale, orderNo: string) => `${siteUrl()}/${locale}/success/${orderNo}`,
  track: (locale: Locale, orderNo: string) => `${siteUrl()}/${locale}/track/${orderNo}`,
  shop: (locale: Locale) => `${siteUrl()}/${locale}`,
  product: (locale: Locale, slug: string) => `${siteUrl()}/${locale}/p/${slug}`,
  checkoutLink: (locale: Locale, token: string) => `${siteUrl()}/${locale}/checkout?link=${token}`,
};

export function log(event: string, data: Record<string, unknown>): void {
  if (process.env.NODE_ENV === "test") return;
  console.info(JSON.stringify({ at: new Date().toISOString(), event, ...data }));
}

export async function sendMessage(
  to: string,
  template: MessageTemplate,
  locale: Locale,
  vars: Record<string, string>,
  orderId?: string,
): Promise<boolean> {
  try {
    await getMessagingProvider().send(to, template, locale, vars, orderId);
    log("wa.sent", { template, orderId });
    return true;
  } catch (err) {
    console.error(JSON.stringify({ event: "wa.failed", template, orderId, error: String(err) }));
    return false;
  }
}

export interface OrderMessageContext {
  id: string;
  orderNo: string;
  locale: Locale;
  customerName: string;
  customerWa: string;
  waOptIn: boolean;
  totalIdr: number;
}

export interface PaymentMessageContext {
  method: PaymentMethod;
  channel?: string | null;
  expiresAt: Date;
  vaNumber?: string | null;
  qrString?: string | null;
  redirectUrl?: string | null;
}

/** Vars available to every order template. */
export function orderVars(o: OrderMessageContext, p?: PaymentMessageContext | null, extra: Record<string, string> = {}) {
  const vars: Record<string, string> = {
    name: o.customerName,
    order_no: o.orderNo,
    total: formatIDR(o.totalIdr),
    pay_url: urls.pay(o.locale, o.orderNo),
    track_url: urls.track(o.locale, o.orderNo),
    shop_url: urls.shop(o.locale),
    ...extra,
  };
  if (p) {
    vars.method = paymentMethodLabel(p.method, (p.channel ?? null) as PaymentChannel | null, o.locale);
    vars.expires = formatDateTimeWIB(p.expiresAt, o.locale);
    vars.va_or_qr_hint =
      p.method === "VA" && p.vaNumber
        ? (o.locale === "id" ? `nomor VA ${p.vaNumber}` : `VA number ${p.vaNumber}`)
        : p.method === "QRIS"
          ? (o.locale === "id" ? `(scan QR di ${urls.pay(o.locale, o.orderNo)})` : `(scan the QR at ${urls.pay(o.locale, o.orderNo)})`)
          : (o.locale === "id" ? `(lanjutkan di ${urls.pay(o.locale, o.orderNo)})` : `(continue at ${urls.pay(o.locale, o.orderNo)})`);
  }
  return vars;
}

/** Sends an order event only if the buyer opted in (WA-05). */
export async function notifyOrder(
  o: OrderMessageContext,
  template: MessageTemplate,
  p?: PaymentMessageContext | null,
  extra?: Record<string, string>,
  opts: { force?: boolean } = {},
): Promise<boolean> {
  if (!o.waOptIn && !opts.force) return false;
  return sendMessage(o.customerWa, template, o.locale, orderVars(o, p, extra), o.id);
}
