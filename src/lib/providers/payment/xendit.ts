/**
 * XenditPaymentProvider (PAY-11) — Xendit Payments API v3 + Payment Sessions. Server-only.
 *
 * Why v3: Xendit's docs (docs.xendit.co, 2026) point new integrations to the unified
 * `POST /v3/payment_requests` (header `api-version: 2024-11-11`), which replaces the per-product
 * QR Codes, E-Wallet Charges and Fixed VA APIs. It has one webhook shape for every channel.
 *
 * | Our method       | Xendit                                   | channel_code              | Instruction                          |
 * |------------------|------------------------------------------|---------------------------|--------------------------------------|
 * | QRIS             | POST /v3/payment_requests (type PAY)     | QRIS                      | actions[QR_STRING] → qrString        |
 * | EWALLET + GOPAY… | POST /v3/payment_requests (type PAY)     | GOPAY/OVO/DANA/SHOPEEPAY  | actions[WEB_URL/DEEPLINK] → redirect |
 * | VA + BCA…        | POST /v3/payment_requests (type PAY)     | <BANK>_VIRTUAL_ACCOUNT    | actions[VIRTUAL_ACCOUNT_NUMBER]      |
 * | CARD             | POST /sessions (PAYMENT_LINK, CARDS only)| —                         | payment_link_url → redirectUrl       |
 *
 * type PAY = single-use, closed amount (= request_amount), so a VA is the "closed VA with expected amount".
 * providerRef = Xendit's id: `pr-…` (payment request) or `ps-…` (session). Auth: Basic secret key.
 *
 * ASSUMPTIONS to verify in Xendit test mode (marked ASSUMPTION below):
 * - QRIS & VA accept `channel_properties.expires_at`; e-wallets ignore it (fixed partner expiry: OVO 15 min,
 *   GoPay 30 min…) — we keep our 15 min order expiry.
 * - OVO needs `channel_properties.account_mobile_number` (E.164); it is a push-notification flow, so there may
 *   be no redirect action (the pay page then shows "open your OVO app").
 * - `idempotency-key` header is honoured by /v3/payment_requests and /sessions.
 */
import { randomBytes } from "node:crypto";
import {
  PAYMENT_EXPIRY_MINUTES,
  type CreatePaymentInput,
  type EwalletChannel,
  type PaymentInstruction,
  type PaymentProvider,
  type PaymentWebhookResult,
  type VaChannel,
} from "@/lib/contracts";
import { siteUrl } from "../env";
import { xenditConfigFromEnv, type XenditConfig } from "../config";
import { basicAuth, requestJson, type FetchLike } from "../http";
import { CARD_REF_MARKER, XenditIgnoredEventError, readXenditWebhook } from "./xendit-webhook";

export const XENDIT_EWALLET_CHANNEL: Record<EwalletChannel, string> = {
  GOPAY: "GOPAY",
  OVO: "OVO",
  DANA: "DANA",
  SHOPEEPAY: "SHOPEEPAY",
};

export const XENDIT_VA_CHANNEL: Record<VaChannel, string> = {
  BCA: "BCA_VIRTUAL_ACCOUNT",
  MANDIRI: "MANDIRI_VIRTUAL_ACCOUNT",
  BNI: "BNI_VIRTUAL_ACCOUNT",
  BRI: "BRI_VIRTUAL_ACCOUNT",
  PERMATA: "PERMATA_VIRTUAL_ACCOUNT",
};

interface XenditAction { type?: string; descriptor?: string; value?: string }
export interface XenditPaymentRequestResponse {
  payment_request_id: string;
  reference_id?: string;
  status?: string;
  actions?: XenditAction[];
  channel_properties?: { expires_at?: string; [k: string]: unknown };
}
export interface XenditSessionResponse {
  payment_session_id: string;
  payment_link_url?: string;
  expires_at?: string;
  status?: string;
}

function xenditError(body: unknown): { code?: string; message?: string } {
  const b = body as { error_code?: string; message?: string } | null;
  return { code: b?.error_code, message: b?.message };
}

/** Locale segment of the success URL (…/<locale>/success/<orderNo>) — defaults to "id". */
function localeFrom(url: string): "id" | "en" {
  try {
    return new URL(url).pathname.split("/").filter(Boolean)[0] === "en" ? "en" : "id";
  } catch {
    return "id";
  }
}

/** Xendit wants alphanumerics/spaces in display names (max ~50). */
function displayName(name: string): string {
  const clean = name.normalize("NFKD").replace(/[^\p{L}\p{N} ]/gu, "").replace(/\s+/g, " ").trim();
  return (clean || "Pelanggan").slice(0, 50);
}

export interface XenditProviderOptions {
  config?: XenditConfig;
  fetchImpl?: FetchLike;
  now?: () => Date;
}

export class XenditPaymentProvider implements PaymentProvider {
  readonly name = "xendit" as const;
  private cfg?: XenditConfig;

  constructor(private readonly opts: XenditProviderOptions = {}) {
    this.cfg = opts.config;
  }

  /** Lazily read env so a misconfigured provider fails on first use with ProviderConfigError. */
  private config(): XenditConfig {
    this.cfg ??= xenditConfigFromEnv();
    return this.cfg;
  }

  private headers(idempotencyKey?: string): Record<string, string> {
    const c = this.config();
    const h: Record<string, string> = { authorization: basicAuth(c.secretKey), "api-version": c.apiVersion };
    if (idempotencyKey) h["idempotency-key"] = idempotencyKey;
    return h;
  }

  private call<T>(path: string, body?: unknown, idempotencyKey?: string): Promise<T> {
    return requestJson<T>({
      provider: "xendit",
      url: `${this.config().baseUrl}${path}`,
      method: "POST",
      headers: this.headers(idempotencyKey),
      body: body ?? {},
      fetchImpl: this.opts.fetchImpl,
      errorOf: xenditError,
    });
  }

  async createPayment(input: CreatePaymentInput): Promise<PaymentInstruction> {
    this.config();
    const now = this.opts.now?.() ?? new Date();
    const expiresAt = new Date(now.getTime() + PAYMENT_EXPIRY_MINUTES[input.method] * 60_000);
    const rand = randomBytes(4).toString("hex");
    const locale = localeFrom(input.successRedirectUrl);
    const payPage = `${siteUrl()}/${locale}/pay/${input.orderNo}`;
    const metadata = { order_id: input.orderId, order_no: input.orderNo };
    const description = `Relevé Dance Supply ${input.orderNo}`;

    if (input.method === "CARD") {
      const referenceId = `${input.orderNo}${CARD_REF_MARKER}${rand}`;
      const res = await this.call<XenditSessionResponse>(
        "/sessions",
        {
          reference_id: referenceId,
          session_type: "PAY",
          mode: "PAYMENT_LINK",
          amount: input.amountIdr,
          currency: "IDR",
          country: "ID",
          capture_method: "AUTOMATIC",
          allow_save_payment_method: "DISABLED",
          allowed_payment_channels: ["CARDS"],
          expires_at: expiresAt.toISOString(),
          locale,
          description,
          // ASSUMPTION: a customer object is accepted inline; reference_id = WA digits so repeat buyers map to one customer.
          customer: {
            reference_id: `wa_${input.customer.wa.replace(/\D/g, "")}`,
            type: "INDIVIDUAL",
            mobile_number: input.customer.wa,
            ...(input.customer.email ? { email: input.customer.email } : {}),
            individual_detail: { given_names: displayName(input.customer.name) },
          },
          metadata,
          success_return_url: input.successRedirectUrl,
          cancel_return_url: payPage,
        },
        referenceId,
      );
      if (!res?.payment_session_id || !res.payment_link_url) throw new Error("Xendit session response without payment_link_url");
      return {
        providerRef: res.payment_session_id,
        method: "CARD",
        expiresAt: res.expires_at ? new Date(res.expires_at) : expiresAt,
        redirectUrl: res.payment_link_url,
      };
    }

    let channelCode: string;
    const channelProperties: Record<string, unknown> = {};
    switch (input.method) {
      case "QRIS":
        channelCode = "QRIS";
        channelProperties.expires_at = expiresAt.toISOString(); // ASSUMPTION: QRIS "Set expiry ✓"
        break;
      case "VA": {
        const ch = input.channel as VaChannel | undefined;
        if (!ch || !(ch in XENDIT_VA_CHANNEL)) throw new Error(`Unknown VA channel ${String(ch)}`);
        channelCode = XENDIT_VA_CHANNEL[ch];
        channelProperties.display_name = displayName(input.customer.name);
        channelProperties.expires_at = expiresAt.toISOString();
        break;
      }
      case "EWALLET": {
        const ch = input.channel as EwalletChannel | undefined;
        if (!ch || !(ch in XENDIT_EWALLET_CHANNEL)) throw new Error("EWALLET requires a channel");
        channelCode = XENDIT_EWALLET_CHANNEL[ch];
        channelProperties.success_return_url = input.successRedirectUrl;
        channelProperties.failure_return_url = payPage;
        if (ch === "OVO") channelProperties.account_mobile_number = input.customer.wa; // ASSUMPTION (see header)
        break;
      }
      default:
        throw new Error(`Unsupported payment method ${String(input.method)}`);
    }

    const referenceId = `${input.orderNo}-${input.method}-${rand}`;
    const res = await this.call<XenditPaymentRequestResponse>(
      "/v3/payment_requests",
      {
        reference_id: referenceId,
        type: "PAY",
        country: "ID",
        currency: "IDR",
        request_amount: input.amountIdr,
        capture_method: "AUTOMATIC",
        channel_code: channelCode,
        channel_properties: channelProperties,
        description,
        metadata,
      },
      referenceId,
    );
    if (!res?.payment_request_id) throw new Error("Xendit payment request response without payment_request_id");
    if (res.status === "FAILED") throw new Error(`Xendit payment request ${res.payment_request_id} FAILED on creation`);

    const action = (d: string) => res.actions?.find((a) => a.descriptor === d)?.value;
    const providerExpiry = res.channel_properties?.expires_at ? new Date(res.channel_properties.expires_at) : undefined;
    const base: PaymentInstruction = {
      providerRef: res.payment_request_id,
      method: input.method,
      channel: input.method === "QRIS" ? undefined : input.channel,
      expiresAt: providerExpiry && !Number.isNaN(providerExpiry.getTime()) ? providerExpiry : expiresAt,
    };
    if (input.method === "QRIS") {
      const qr = action("QR_STRING");
      if (!qr) throw new Error("Xendit QRIS response without QR_STRING action");
      return { ...base, qrString: qr };
    }
    if (input.method === "VA") {
      const va = action("VIRTUAL_ACCOUNT_NUMBER");
      if (!va) throw new Error("Xendit VA response without VIRTUAL_ACCOUNT_NUMBER action");
      return { ...base, vaNumber: va };
    }
    return { ...base, redirectUrl: action("WEB_URL") ?? action("DEEPLINK_URL") };
  }

  /** Cancels a pending payment request / session. Xendit answers 4xx if it is already paid/expired → throws. */
  async cancelPayment(providerRef: string): Promise<void> {
    const ref = encodeURIComponent(providerRef);
    const path = providerRef.startsWith("ps-") ? `/sessions/${ref}/cancel` : `/v3/payment_requests/${ref}/cancel`;
    await this.call<unknown>(path, {});
  }

  async verifyAndParseWebhook(req: Request): Promise<PaymentWebhookResult> {
    const parsed = await readXenditWebhook(req, this.config().callbackToken);
    if (parsed.kind === "ignored") throw new XenditIgnoredEventError(parsed.event, parsed.reason);
    return parsed.result;
  }
}
