/**
 * Provider factory (PAY-01, SHP-01, WA-04): PAYMENT_PROVIDER=mock|xendit, SHIPPING_PROVIDER=mock|biteship,
 * MESSAGING_PROVIDER=outbox|waba. Server-only. Mock/outbox are the defaults (demo).
 *
 * Fail fast: an unknown provider name throws immediately; a real provider whose env vars are missing throws
 * ProviderConfigError ("<provider> is not configured: missing X, Y") on its first call. Use
 * `validateProviderEnv()` (./config) to check everything at once before switching (docs/11-go-live-integrations.md).
 */
import type { MessagingProvider, PaymentProvider, ShippingProvider } from "@/lib/contracts";
import { MockPaymentProvider } from "./payment/mock";
import { XenditPaymentProvider } from "./payment/xendit";
import { MockShippingProvider } from "./shipping/mock";
import { BiteshipShippingProvider } from "./shipping/biteship";
import { OutboxMessagingProvider } from "./messaging/outbox";
import { WabaMessagingProvider } from "./messaging/waba";
import { ProviderConfigError, validateProviderEnv } from "./config";

function pick(kind: string, name: string | undefined, fallback: string, allowed: string[]): string {
  const value = name?.trim() || fallback;
  if (!allowed.includes(value)) {
    throw new Error(`${kind}=${value} is not supported (use ${allowed.join("|")})`);
  }
  return value;
}

export function getPaymentProvider(name = process.env.PAYMENT_PROVIDER): PaymentProvider {
  return pick("PAYMENT_PROVIDER", name, "mock", ["mock", "xendit"]) === "xendit"
    ? new XenditPaymentProvider()
    : new MockPaymentProvider();
}

let biteship: BiteshipShippingProvider | undefined;
export function getShippingProvider(name = process.env.SHIPPING_PROVIDER): ShippingProvider {
  if (pick("SHIPPING_PROVIDER", name, "mock", ["mock", "biteship"]) !== "biteship") return new MockShippingProvider();
  // one instance per process so the Biteship area-id cache is reused
  biteship ??= new BiteshipShippingProvider();
  return biteship;
}

export function getMessagingProvider(name = process.env.MESSAGING_PROVIDER): MessagingProvider {
  return pick("MESSAGING_PROVIDER", name, "outbox", ["outbox", "waba"]) === "waba"
    ? new WabaMessagingProvider()
    : new OutboxMessagingProvider();
}

export { MockPaymentProvider, XenditPaymentProvider, MockShippingProvider, BiteshipShippingProvider };
export { OutboxMessagingProvider, WabaMessagingProvider };
export { ProviderConfigError, validateProviderEnv };
