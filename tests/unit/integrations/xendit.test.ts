import { beforeAll, describe, expect, it } from "vitest";
import type { CreatePaymentInput } from "@/lib/contracts";
import { XenditPaymentProvider } from "@/lib/providers/payment/xendit";
import {
  XENDIT_CALLBACK_HEADER,
  XenditIgnoredEventError,
  parseXenditEvent,
  xenditWebhookPreflight,
} from "@/lib/providers/payment/xendit-webhook";
import { ProviderConfigError } from "@/lib/providers/config";
import { ProviderHttpError } from "@/lib/providers/http";
import { mockFetch } from "./helpers";

const config = { secretKey: "xnd_development_secret", callbackToken: "cb-token-123", baseUrl: "https://api.xendit.test", apiVersion: "2024-11-11" };
const NOW = new Date("2026-11-05T03:00:00Z");

beforeAll(() => {
  process.env.NEXT_PUBLIC_SITE_URL = "https://releve.test";
});

const input = (over: Partial<CreatePaymentInput> = {}): CreatePaymentInput => ({
  orderId: "00000000-0000-0000-0000-000000000001",
  orderNo: "RDS-261105-AB12",
  amountIdr: 685_000,
  method: "QRIS",
  customer: { name: "Siti Rahma!", wa: "+6281234567890", email: "siti@example.com" },
  successRedirectUrl: "https://releve.test/id/success/RDS-261105-AB12",
  ...over,
});

const prResponse = (actions: { type: string; descriptor: string; value: string }[], extra: Record<string, unknown> = {}) => ({
  payment_request_id: "pr-abc",
  reference_id: "x",
  status: "REQUIRES_ACTION",
  actions,
  ...extra,
});

function provider(responder: Parameters<typeof mockFetch>[0]) {
  const m = mockFetch(responder);
  return { p: new XenditPaymentProvider({ config, fetchImpl: m.fetchImpl, now: () => NOW }), calls: m.calls };
}

describe("XenditPaymentProvider.createPayment (PAY-11)", () => {
  it("QRIS: v3 payment request with Basic auth, api-version, idempotency key, expiry; maps QR_STRING", async () => {
    const { p, calls } = provider(() => ({
      status: 201,
      body: prResponse([{ type: "PRESENT_TO_CUSTOMER", descriptor: "QR_STRING", value: "00020101021226…" }], {
        channel_properties: { expires_at: "2026-11-05T03:30:00Z" },
      }),
    }));
    const ins = await p.createPayment(input());
    expect(calls).toHaveLength(1);
    const c = calls[0];
    expect(c.url).toBe("https://api.xendit.test/v3/payment_requests");
    expect(c.method).toBe("POST");
    expect(c.headers.authorization).toBe(`Basic ${Buffer.from("xnd_development_secret:").toString("base64")}`);
    expect(c.headers["api-version"]).toBe("2024-11-11");
    const body = c.body as Record<string, unknown>;
    expect(c.headers["idempotency-key"]).toBe(body.reference_id);
    expect(body).toMatchObject({
      type: "PAY",
      country: "ID",
      currency: "IDR",
      request_amount: 685_000,
      capture_method: "AUTOMATIC",
      channel_code: "QRIS",
      channel_properties: { expires_at: "2026-11-05T03:30:00.000Z" },
      metadata: { order_no: "RDS-261105-AB12" },
    });
    expect(String(body.reference_id)).toMatch(/^RDS-261105-AB12-QRIS-[0-9a-f]{8}$/);
    expect(ins).toEqual({
      providerRef: "pr-abc",
      method: "QRIS",
      channel: undefined,
      expiresAt: new Date("2026-11-05T03:30:00Z"),
      qrString: "00020101021226…",
    });
  });

  it("VA: <BANK>_VIRTUAL_ACCOUNT, closed amount, display name sanitised, 24 h expiry; maps VA number", async () => {
    const { p, calls } = provider(() => ({
      status: 201,
      body: prResponse([{ type: "PRESENT_TO_CUSTOMER", descriptor: "VIRTUAL_ACCOUNT_NUMBER", value: "381659999123456" }]),
    }));
    const ins = await p.createPayment(input({ method: "VA", channel: "MANDIRI" }));
    const body = calls[0].body as { channel_code: string; request_amount: number; channel_properties: Record<string, string> };
    expect(body.channel_code).toBe("MANDIRI_VIRTUAL_ACCOUNT");
    expect(body.request_amount).toBe(685_000);
    expect(body.channel_properties.display_name).toBe("Siti Rahma");
    expect(body.channel_properties.expires_at).toBe(new Date(NOW.getTime() + 24 * 3600_000).toISOString());
    expect(ins).toMatchObject({ providerRef: "pr-abc", method: "VA", channel: "MANDIRI", vaNumber: "381659999123456" });
    expect(ins.expiresAt).toEqual(new Date(NOW.getTime() + 24 * 3600_000));
  });

  it("e-wallet: return URLs, OVO mobile number; prefers WEB_URL over deeplink", async () => {
    const { p, calls } = provider(() => ({
      status: 201,
      body: prResponse([
        { type: "REDIRECT_CUSTOMER", descriptor: "DEEPLINK_URL", value: "gojek://pay" },
        { type: "REDIRECT_CUSTOMER", descriptor: "WEB_URL", value: "https://gopay.test/pay" },
      ]),
    }));
    const gopay = await p.createPayment(input({ method: "EWALLET", channel: "GOPAY", successRedirectUrl: "https://releve.test/en/success/RDS-261105-AB12" }));
    expect(calls[0].body).toMatchObject({
      channel_code: "GOPAY",
      channel_properties: {
        success_return_url: "https://releve.test/en/success/RDS-261105-AB12",
        failure_return_url: "https://releve.test/en/pay/RDS-261105-AB12",
      },
    });
    expect((calls[0].body as { channel_properties: object }).channel_properties).not.toHaveProperty("account_mobile_number");
    expect(gopay.redirectUrl).toBe("https://gopay.test/pay");
    expect(gopay.expiresAt).toEqual(new Date(NOW.getTime() + 15 * 60_000));

    await p.createPayment(input({ method: "EWALLET", channel: "OVO" }));
    expect(calls[1].body).toMatchObject({ channel_code: "OVO", channel_properties: { account_mobile_number: "+6281234567890" } });
  });

  it("card: hosted Payment Session restricted to CARDS; providerRef = session id", async () => {
    const { p, calls } = provider(() => ({
      status: 201,
      body: { payment_session_id: "ps-123", payment_link_url: "https://xen.to/abc", expires_at: "2026-11-05T03:15:00Z", status: "ACTIVE" },
    }));
    const ins = await p.createPayment(input({ method: "CARD" }));
    expect(calls[0].url).toBe("https://api.xendit.test/sessions");
    expect(calls[0].body).toMatchObject({
      session_type: "PAY",
      mode: "PAYMENT_LINK",
      amount: 685_000,
      currency: "IDR",
      country: "ID",
      allowed_payment_channels: ["CARDS"],
      locale: "id",
      success_return_url: "https://releve.test/id/success/RDS-261105-AB12",
      cancel_return_url: "https://releve.test/id/pay/RDS-261105-AB12",
    });
    expect(String((calls[0].body as { reference_id: string }).reference_id)).toMatch(/^RDS-261105-AB12-CARD-/);
    expect(ins).toEqual({ providerRef: "ps-123", method: "CARD", expiresAt: new Date("2026-11-05T03:15:00Z"), redirectUrl: "https://xen.to/abc" });
  });

  it("errors: Xendit error body → ProviderHttpError with code; missing action → error; bad channel", async () => {
    const { p } = provider(() => ({ status: 400, body: { error_code: "API_VALIDATION_ERROR", message: "request_amount too low" } }));
    const err = await p.createPayment(input()).catch((e) => e);
    expect(err).toBeInstanceOf(ProviderHttpError);
    expect(err).toMatchObject({ status: 400, code: "API_VALIDATION_ERROR" });
    expect(String(err.message)).toContain("request_amount too low");

    const { p: p2 } = provider(() => ({ status: 201, body: prResponse([]) }));
    await expect(p2.createPayment(input())).rejects.toThrow(/QR_STRING/);
    await expect(p2.createPayment(input({ method: "VA", channel: "GOPAY" }))).rejects.toThrow(/Unknown VA channel/);
  });

  it("missing env → ProviderConfigError mentioning 'not configured'", async () => {
    const saved = { k: process.env.XENDIT_SECRET_KEY, t: process.env.XENDIT_CALLBACK_TOKEN };
    delete process.env.XENDIT_SECRET_KEY;
    delete process.env.XENDIT_CALLBACK_TOKEN;
    try {
      const err = await new XenditPaymentProvider().createPayment(input()).catch((e) => e);
      expect(err).toBeInstanceOf(ProviderConfigError);
      expect(err.message).toMatch(/not configured: missing XENDIT_SECRET_KEY, XENDIT_CALLBACK_TOKEN/);
    } finally {
      if (saved.k) process.env.XENDIT_SECRET_KEY = saved.k;
      if (saved.t) process.env.XENDIT_CALLBACK_TOKEN = saved.t;
    }
  });
});

describe("XenditPaymentProvider.cancelPayment", () => {
  it("cancels payment requests and sessions on the right endpoint", async () => {
    const { p, calls } = provider(() => ({ body: { status: "CANCELED" } }));
    await p.cancelPayment("pr-abc");
    await p.cancelPayment("ps-123");
    expect(calls.map((c) => [c.method, c.url])).toEqual([
      ["POST", "https://api.xendit.test/v3/payment_requests/pr-abc/cancel"],
      ["POST", "https://api.xendit.test/sessions/ps-123/cancel"],
    ]);
  });
});

/* ---------- webhooks ---------- */

const capture = {
  event: "payment.capture",
  business_id: "biz",
  created: "2026-11-05T03:05:00.000Z",
  data: {
    payment_id: "py-111",
    payment_request_id: "pr-abc",
    reference_id: "RDS-261105-AB12-QRIS-1a2b3c4d",
    channel_code: "QRIS",
    status: "SUCCEEDED",
    request_amount: 685000,
    captures: [{ capture_id: "cptr-1", capture_timestamp: "2026-11-05T03:04:59Z", capture_amount: 685000 }],
    updated: "2026-11-05T03:05:00Z",
  },
};

const webhook = (body: unknown, token = "cb-token-123") =>
  new Request("https://releve.test/api/webhooks/payment", {
    method: "POST",
    headers: { "content-type": "application/json", ...(token ? { [XENDIT_CALLBACK_HEADER]: token } : {}) },
    body: JSON.stringify(body),
  });

describe("Xendit webhooks (PAY-07/08)", () => {
  const p = new XenditPaymentProvider({ config });

  it("payment.capture → PAID with stable eventId and capture time", async () => {
    const r = await p.verifyAndParseWebhook(webhook(capture));
    expect(r).toMatchObject({ eventId: "xendit:payment.capture:py-111", providerRef: "pr-abc", status: "PAID" });
    expect(r.paidAt).toEqual(new Date("2026-11-05T03:04:59Z"));
    expect(r.raw).toEqual(capture);
    // Xendit retries the identical payload → identical eventId (idempotency in payment_events)
    const again = await p.verifyAndParseWebhook(webhook(capture));
    expect(again.eventId).toBe(r.eventId);
  });

  it("payment.failure → FAILED; payment_request.expiry → EXPIRED; sessions → PAID/EXPIRED", () => {
    const fail = parseXenditEvent({ event: "payment.failure", data: { payment_id: "py-2", payment_request_id: "pr-x", status: "FAILED" } });
    expect(fail).toMatchObject({ kind: "event", result: { eventId: "xendit:payment.failure:py-2", providerRef: "pr-x", status: "FAILED" } });
    expect(fail.kind === "event" && fail.result.paidAt).toBeFalsy();

    const exp = parseXenditEvent({ event: "payment_request.expiry", data: { payment_request_id: "pr-x", status: "EXPIRED" } });
    expect(exp).toMatchObject({ kind: "event", result: { eventId: "xendit:payment_request.expiry:pr-x", status: "EXPIRED" } });

    const done = parseXenditEvent({
      event: "payment_session.completed",
      data: { payment_session_id: "ps-123", reference_id: "RDS-1-CARD-x", status: "COMPLETED", updated: "2026-11-05T03:10:00Z" },
    });
    expect(done).toMatchObject({ kind: "event", result: { eventId: "xendit:payment_session.completed:ps-123", providerRef: "ps-123", status: "PAID" } });
    expect(done.kind === "event" && done.result.paidAt).toEqual(new Date("2026-11-05T03:10:00Z"));

    const sx = parseXenditEvent({ event: "payment_session.expired", data: { payment_session_id: "ps-123" } });
    expect(sx).toMatchObject({ kind: "event", result: { status: "EXPIRED", providerRef: "ps-123" } });
  });

  it("ignores unrelated events and card-session inner payments", async () => {
    expect(parseXenditEvent({ event: "refund.succeeded", data: {} })).toEqual({ kind: "ignored", event: "refund.succeeded", reason: "UNHANDLED_EVENT" });
    const inner = { ...capture, data: { ...capture.data, reference_id: "RDS-261105-AB12-CARD-1a2b3c4d", channel_code: "CARDS" } };
    expect(parseXenditEvent(inner)).toMatchObject({ kind: "ignored", reason: "SESSION_INNER_PAYMENT" });
    await expect(p.verifyAndParseWebhook(webhook(inner))).rejects.toBeInstanceOf(XenditIgnoredEventError);
  });

  it("rejects a wrong / missing x-callback-token and malformed bodies", async () => {
    await expect(p.verifyAndParseWebhook(webhook(capture, "wrong-token"))).rejects.toThrow(/x-callback-token/);
    await expect(p.verifyAndParseWebhook(webhook(capture, ""))).rejects.toThrow(/x-callback-token/);
    const raw = new Request("https://x/api", { method: "POST", headers: { [XENDIT_CALLBACK_HEADER]: "cb-token-123" }, body: "not json" });
    await expect(p.verifyAndParseWebhook(raw)).rejects.toThrow(/Malformed/);
    await expect(p.verifyAndParseWebhook(webhook({ event: "payment.capture", data: { payment_id: "py-1" } }))).rejects.toThrow(/payment_request_id/);
  });

  it("route preflight: 200 for ignored authentic events, null otherwise (body still readable)", async () => {
    const ignored = await xenditWebhookPreflight(webhook({ event: "payment_token.activation", data: {} }), "cb-token-123");
    expect(ignored?.status).toBe(200);
    expect(await ignored?.json()).toMatchObject({ ok: true, ignored: "UNHANDLED_EVENT" });

    const req = webhook(capture);
    expect(await xenditWebhookPreflight(req, "cb-token-123")).toBeNull();
    expect(await p.verifyAndParseWebhook(req)).toMatchObject({ status: "PAID" }); // original body not consumed
    expect(await xenditWebhookPreflight(webhook({ event: "refund.succeeded", data: {} }, "bad"), "cb-token-123")).toBeNull();
    expect(await xenditWebhookPreflight(webhook(capture), undefined)).toBeNull();
  });
});
