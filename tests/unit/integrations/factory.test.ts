import { describe, expect, it } from "vitest";
import { getMessagingProvider, getPaymentProvider, getShippingProvider, validateProviderEnv } from "@/lib/providers";
import { wabaConfigFromEnv, xenditConfigFromEnv } from "@/lib/providers/config";

describe("provider factory & env validation (WS-7)", () => {
  it("defaults to the mock providers", () => {
    expect(getPaymentProvider(undefined).name).toBe("mock");
    expect(getShippingProvider(undefined).name).toBe("mock");
    expect(getMessagingProvider(undefined).name).toBe("outbox");
    expect(getPaymentProvider("").name).toBe("mock");
  });

  it("selects the real providers by name", () => {
    expect(getPaymentProvider("xendit").name).toBe("xendit");
    expect(getShippingProvider("biteship").name).toBe("biteship");
    expect(getMessagingProvider("waba").name).toBe("waba");
  });

  it("unknown provider names fail fast", () => {
    expect(() => getPaymentProvider("midtrans")).toThrow(/PAYMENT_PROVIDER=midtrans is not supported \(use mock\|xendit\)/);
    expect(() => getShippingProvider("rajaongkir")).toThrow(/SHIPPING_PROVIDER/);
    expect(() => getMessagingProvider("twilio")).toThrow(/MESSAGING_PROVIDER/);
  });

  it("validateProviderEnv reports missing vars only for the selected real providers", () => {
    expect(validateProviderEnv({})).toEqual({ ok: true, problems: [] });
    expect(validateProviderEnv({ PAYMENT_PROVIDER: "mock", XENDIT_SECRET_KEY: "" })).toEqual({ ok: true, problems: [] });
    const r = validateProviderEnv({ PAYMENT_PROVIDER: "xendit", SHIPPING_PROVIDER: "biteship", MESSAGING_PROVIDER: "waba", WABA_TOKEN: "t" });
    expect(r.ok).toBe(false);
    expect(r.problems).toEqual([
      "Xendit payment provider is not configured: missing XENDIT_SECRET_KEY, XENDIT_CALLBACK_TOKEN",
      "Biteship shipping provider is not configured: missing BITESHIP_API_KEY",
      "WhatsApp Business API messaging provider is not configured: missing WABA_PHONE_NUMBER_ID",
    ]);
    expect(validateProviderEnv({ PAYMENT_PROVIDER: "paypal" }).problems).toEqual(["PAYMENT_PROVIDER=paypal is not one of mock|xendit"]);
  });

  it("config defaults", () => {
    expect(xenditConfigFromEnv({ XENDIT_SECRET_KEY: "k", XENDIT_CALLBACK_TOKEN: "t" })).toEqual({
      secretKey: "k", callbackToken: "t", baseUrl: "https://api.xendit.co", apiVersion: "2024-11-11",
    });
    expect(wabaConfigFromEnv({ WABA_TOKEN: "t", WABA_PHONE_NUMBER_ID: "1", WABA_LANG_EN: "en_US" })).toMatchObject({
      apiVersion: "v26.0", baseUrl: "https://graph.facebook.com", templatePrefix: "releve_", languages: { id: "id", en: "en_US" },
    });
  });
});
