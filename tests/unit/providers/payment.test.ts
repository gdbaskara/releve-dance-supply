import { beforeAll, describe, expect, it } from "vitest";
import { MockPaymentProvider, buildMockWebhookRequest, signMockPayload, MOCK_SIGNATURE_HEADER } from "@/lib/providers/payment/mock";
import { getPaymentProvider, getShippingProvider, getMessagingProvider } from "@/lib/providers";
import type { CreatePaymentInput } from "@/lib/contracts";

beforeAll(() => {
  process.env.WEBHOOK_SECRET = "unit-secret";
  process.env.NEXT_PUBLIC_SITE_URL = "http://shop.test";
});

const input = (over: Partial<CreatePaymentInput> = {}): CreatePaymentInput => ({
  orderId: "o1", orderNo: "RDS-261105-AB12", amountIdr: 712_500, method: "QRIS",
  customer: { name: "A", wa: "+6281234567890" }, successRedirectUrl: "http://shop.test/en/success/RDS-261105-AB12", ...over,
});

describe("MockPaymentProvider (PAY-01..05)", () => {
  const p = new MockPaymentProvider();

  it("QRIS: mock QR string, 30 min expiry", async () => {
    const t = Date.now();
    const r = await p.createPayment(input());
    expect(r.qrString).toBe("MOCKQRIS|RDS-261105-AB12|712500");
    expect(r.expiresAt.getTime() - t).toBeGreaterThanOrEqual(30 * 60_000 - 1000);
    expect(r.expiresAt.getTime() - t).toBeLessThanOrEqual(30 * 60_000 + 1000);
  });

  it("VA: bank prefix + 10 digits, 24 h", async () => {
    const prefixes = { BCA: "39108", MANDIRI: "88908", BNI: "8808", BRI: "26215", PERMATA: "8215" } as const;
    for (const [ch, pre] of Object.entries(prefixes)) {
      const r = await p.createPayment(input({ method: "VA", channel: ch as keyof typeof prefixes }));
      expect(r.vaNumber).toMatch(new RegExp(`^${pre}\\d{10}$`));
      expect(r.expiresAt.getTime() - Date.now()).toBeGreaterThan(23 * 3600_000);
    }
  });

  it("e-wallet / card redirect to the app's own pay page (locale kept), 15 min", async () => {
    const e = await p.createPayment(input({ method: "EWALLET", channel: "GOPAY" }));
    expect(e.redirectUrl).toBe("http://shop.test/en/pay/RDS-261105-AB12?step=ewallet");
    const c = await p.createPayment(input({ method: "CARD", successRedirectUrl: "http://shop.test/id/success/X" }));
    expect(c.redirectUrl).toBe("http://shop.test/id/pay/RDS-261105-AB12?step=3ds");
    expect(c.expiresAt.getTime() - Date.now()).toBeLessThanOrEqual(15 * 60_000 + 1000);
    await expect(p.createPayment(input({ method: "EWALLET" }))).rejects.toThrow();
  });

  it("webhook: valid signature parses; tampered / unsigned rejected", async () => {
    const ok = await p.verifyAndParseWebhook(buildMockWebhookRequest({ event_id: "evt_1", provider_ref: "ref", status: "PAID" }));
    expect(ok).toMatchObject({ eventId: "evt_1", providerRef: "ref", status: "PAID" });
    expect(ok.paidAt).toBeInstanceOf(Date);

    const body = JSON.stringify({ event_id: "evt_2", provider_ref: "ref", status: "PAID" });
    const bad = new Request("http://x", { method: "POST", body, headers: { [MOCK_SIGNATURE_HEADER]: signMockPayload(body + " ") } });
    await expect(p.verifyAndParseWebhook(bad)).rejects.toThrow(/signature/i);
    const none = new Request("http://x", { method: "POST", body });
    await expect(p.verifyAndParseWebhook(none)).rejects.toThrow();
    const junk = "{not json";
    const malformed = new Request("http://x", { method: "POST", body: junk, headers: { [MOCK_SIGNATURE_HEADER]: signMockPayload(junk) } });
    await expect(p.verifyAndParseWebhook(malformed)).rejects.toThrow();
  });

  it("factory picks providers from env; stubs throw 'not configured'", async () => {
    expect(getPaymentProvider("mock").name).toBe("mock");
    expect(getShippingProvider("mock").name).toBe("mock");
    expect(getMessagingProvider("outbox").name).toBe("outbox");
    await expect(getPaymentProvider("xendit").createPayment(input())).rejects.toThrow(/not configured/);
    await expect(getPaymentProvider("xendit").cancelPayment("x")).rejects.toThrow(/not configured/);
    await expect(getPaymentProvider("xendit").verifyAndParseWebhook(new Request("http://x"))).rejects.toThrow(/not configured/);
    await expect(getShippingProvider("biteship").getRates({} as never)).rejects.toThrow(/not configured/);
    await expect(getMessagingProvider("waba").send("+62", "ORDER_CREATED", "id", {})).rejects.toThrow(/not configured/);
  });
});
