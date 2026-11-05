/**
 * MockPaymentProvider — docs/05 §5. Deterministic-looking QR/VA data, no network.
 * Webhooks: JSON body signed with HMAC-SHA256(hex, WEBHOOK_SECRET) in header `x-mock-signature`.
 */
import { createHmac, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import {
  PAYMENT_EXPIRY_MINUTES,
  type CreatePaymentInput,
  type PaymentInstruction,
  type PaymentProvider,
  type PaymentWebhookResult,
  type VaChannel,
} from "@/lib/contracts";
import { siteUrl, webhookSecret } from "../env";

export const MOCK_SIGNATURE_HEADER = "x-mock-signature";

export const VA_PREFIX: Record<VaChannel, string> = {
  BCA: "39108",
  MANDIRI: "88908",
  BNI: "8808",
  BRI: "26215",
  PERMATA: "8215",
};

export interface MockWebhookBody {
  event_id: string;
  provider_ref: string;
  status: "PAID" | "EXPIRED" | "FAILED";
  paid_at?: string;
}

export class WebhookSignatureError extends Error {
  constructor(message = "Invalid webhook signature") {
    super(message);
    this.name = "WebhookSignatureError";
  }
}

export function signMockPayload(rawBody: string, secret = webhookSecret()): string {
  return createHmac("sha256", secret).update(rawBody).digest("hex");
}

/** Build a signed mock webhook Request (used by /api/demo/simulate-payment and tests). */
export function buildMockWebhookRequest(
  body: Omit<MockWebhookBody, "event_id"> & { event_id?: string },
  url = `${siteUrl()}/api/webhooks/payment`,
): Request {
  const full: MockWebhookBody = { event_id: body.event_id ?? `evt_${randomBytes(9).toString("hex")}`, ...body };
  const raw = JSON.stringify(full);
  return new Request(url, {
    method: "POST",
    headers: { "content-type": "application/json", [MOCK_SIGNATURE_HEADER]: signMockPayload(raw) },
    body: raw,
  });
}

function digits(n: number): string {
  let s = "";
  for (let i = 0; i < n; i++) s += randomInt(0, 10).toString();
  return s;
}

/** Locale segment of the success URL (http://host/<locale>/success/<orderNo>) — defaults to "id". */
function localeFrom(url: string): string {
  try {
    const seg = new URL(url).pathname.split("/").filter(Boolean)[0];
    return seg === "en" ? "en" : "id";
  } catch {
    return "id";
  }
}

export class MockPaymentProvider implements PaymentProvider {
  readonly name = "mock" as const;

  async createPayment(input: CreatePaymentInput): Promise<PaymentInstruction> {
    const now = Date.now();
    const expiresAt = new Date(now + PAYMENT_EXPIRY_MINUTES[input.method] * 60_000);
    const providerRef = `mock_${input.orderNo}_${randomBytes(4).toString("hex")}`;
    const base: PaymentInstruction = { providerRef, method: input.method, channel: input.channel, expiresAt };
    const payPage = `${siteUrl()}/${localeFrom(input.successRedirectUrl)}/pay/${input.orderNo}`;
    switch (input.method) {
      case "QRIS":
        return { ...base, channel: undefined, qrString: `MOCKQRIS|${input.orderNo}|${input.amountIdr}` };
      case "VA": {
        const ch = (input.channel ?? "BCA") as VaChannel;
        if (!(ch in VA_PREFIX)) throw new Error(`Unknown VA channel ${ch}`);
        return { ...base, channel: ch, vaNumber: VA_PREFIX[ch] + digits(10) };
      }
      case "EWALLET":
        if (!input.channel) throw new Error("EWALLET requires a channel");
        return { ...base, redirectUrl: `${payPage}?step=ewallet` };
      case "CARD":
        return { ...base, channel: undefined, redirectUrl: `${payPage}?step=3ds` };
    }
  }

  async cancelPayment(): Promise<void> {
    // Nothing to do for the mock — the service marks the payment CANCELLED.
  }

  async verifyAndParseWebhook(req: Request): Promise<PaymentWebhookResult> {
    const raw = await req.text();
    const sig = req.headers.get(MOCK_SIGNATURE_HEADER) ?? "";
    const expected = signMockPayload(raw);
    const a = Buffer.from(sig, "utf8");
    const b = Buffer.from(expected, "utf8");
    if (a.length !== b.length || !timingSafeEqual(a, b)) throw new WebhookSignatureError();
    let body: MockWebhookBody;
    try {
      body = JSON.parse(raw) as MockWebhookBody;
    } catch {
      throw new WebhookSignatureError("Malformed webhook body");
    }
    if (!body.event_id || !body.provider_ref || !["PAID", "EXPIRED", "FAILED"].includes(body.status)) {
      throw new WebhookSignatureError("Malformed webhook body");
    }
    return {
      eventId: body.event_id,
      providerRef: body.provider_ref,
      status: body.status,
      paidAt: body.status === "PAID" ? new Date(body.paid_at ?? Date.now()) : undefined,
      raw: body,
    };
  }
}
