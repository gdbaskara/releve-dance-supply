/**
 * Provider factory (PAY-01, SHP-01, WA-04): PAYMENT_PROVIDER=mock|xendit, SHIPPING_PROVIDER=mock|biteship,
 * MESSAGING_PROVIDER=outbox|waba. Server-only.
 */
import type { MessagingProvider, PaymentProvider, ShippingProvider } from "@/lib/contracts";
import { MockPaymentProvider } from "./payment/mock";
import { XenditPaymentProvider } from "./payment/xendit";
import { MockShippingProvider } from "./shipping/mock";
import { BiteshipShippingProvider } from "./shipping/biteship";
import { OutboxMessagingProvider } from "./messaging/outbox";
import { WabaMessagingProvider } from "./messaging/waba";

export function getPaymentProvider(name = process.env.PAYMENT_PROVIDER ?? "mock"): PaymentProvider {
  return name === "xendit" ? new XenditPaymentProvider() : new MockPaymentProvider();
}

export function getShippingProvider(name = process.env.SHIPPING_PROVIDER ?? "mock"): ShippingProvider {
  return name === "biteship" ? new BiteshipShippingProvider() : new MockShippingProvider();
}

export function getMessagingProvider(name = process.env.MESSAGING_PROVIDER ?? "outbox"): MessagingProvider {
  return name === "waba" ? new WabaMessagingProvider() : new OutboxMessagingProvider();
}

export { MockPaymentProvider, XenditPaymentProvider, MockShippingProvider, BiteshipShippingProvider };
export { OutboxMessagingProvider, WabaMessagingProvider };
