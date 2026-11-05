/**
 * Xendit webhook parsing (PAY-07/08/11). Pure apart from the token check.
 *
 * Verification: Xendit sends the account's "Webhook verification token" in header `x-callback-token`;
 * it must equal XENDIT_CALLBACK_TOKEN (constant-time compare).
 *
 * Events we act on (Payments API v3 + Payment Sessions, api-version 2024-11-11):
 * | event                      | → status | providerRef            | eventId (stable across Xendit retries)        |
 * |----------------------------|----------|------------------------|-----------------------------------------------|
 * | payment.capture            | PAID     | data.payment_request_id| xendit:payment.capture:<payment_id>           |
 * | payment.failure            | FAILED   | data.payment_request_id| xendit:payment.failure:<payment_id>           |
 * | payment_request.expiry     | EXPIRED  | data.payment_request_id| xendit:payment_request.expiry:<pr id>         |
 * | payment_session.completed  | PAID     | data.payment_session_id| xendit:payment_session.completed:<ps id>      |
 * | payment_session.expired    | EXPIRED  | data.payment_session_id| xendit:payment_session.expired:<ps id>        |
 *
 * Ignored (acknowledged with 200 so Xendit stops retrying, see route.ts):
 * - any other event (payment.authorization, payment.expiry, payment_token.*, refund.*, …)
 * - payment.* events that belong to a card Payment Session (reference_id contains CARD_REF_MARKER): the
 *   session's own `payment_session.completed` event is the one we track, because the session's inner
 *   payment_request_id is not known when the payment is created.
 *   ASSUMPTION (verify in test mode): the inner payment request inherits the session's reference_id.
 */
import { timingSafeEqual } from "node:crypto";
import type { PaymentWebhookResult } from "@/lib/contracts";

export const XENDIT_CALLBACK_HEADER = "x-callback-token";
/** Marks reference_ids of card Payment Sessions: `<orderNo>-CARD-<rand>`. */
export const CARD_REF_MARKER = "-CARD-";

export class XenditWebhookError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "XenditWebhookError";
  }
}

/** A valid, authentic event that we deliberately do not process. */
export class XenditIgnoredEventError extends Error {
  constructor(readonly event: string, readonly reason: "UNHANDLED_EVENT" | "SESSION_INNER_PAYMENT") {
    super(`Ignored Xendit event ${event} (${reason})`);
    this.name = "XenditIgnoredEventError";
  }
}

export function verifyCallbackToken(received: string | null, expected: string): boolean {
  if (!received || !expected) return false;
  const a = Buffer.from(received, "utf8");
  const b = Buffer.from(expected, "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}

interface XenditEnvelope {
  event?: string;
  created?: string;
  data?: {
    payment_id?: string;
    payment_request_id?: string;
    payment_session_id?: string;
    reference_id?: string;
    status?: string;
    captures?: { capture_timestamp?: string }[];
    updated?: string;
    created?: string;
    [k: string]: unknown;
  };
}

function date(s: string | undefined): Date | undefined {
  if (!s) return undefined;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

export type ParsedXenditEvent =
  | { kind: "event"; result: PaymentWebhookResult }
  | { kind: "ignored"; event: string; reason: "UNHANDLED_EVENT" | "SESSION_INNER_PAYMENT" };

/** Maps a verified webhook body to PaymentWebhookResult (or an ignore decision). Throws on malformed bodies. */
export function parseXenditEvent(body: unknown): ParsedXenditEvent {
  const env = body as XenditEnvelope;
  if (!env || typeof env !== "object" || typeof env.event !== "string" || !env.data || typeof env.data !== "object") {
    throw new XenditWebhookError("Malformed Xendit webhook body");
  }
  const { event, data } = env;
  const need = (v: string | undefined, field: string): string => {
    if (!v) throw new XenditWebhookError(`Xendit ${event} webhook without data.${field}`);
    return v;
  };

  switch (event) {
    case "payment.capture":
    case "payment.failure": {
      if (data.reference_id?.includes(CARD_REF_MARKER)) return { kind: "ignored", event, reason: "SESSION_INNER_PAYMENT" };
      const providerRef = need(data.payment_request_id, "payment_request_id");
      const paymentId = need(data.payment_id, "payment_id");
      const paid = event === "payment.capture";
      return {
        kind: "event",
        result: {
          eventId: `xendit:${event}:${paymentId}`,
          providerRef,
          status: paid ? "PAID" : "FAILED",
          paidAt: paid ? (date(data.captures?.[0]?.capture_timestamp) ?? date(data.updated) ?? date(env.created) ?? new Date()) : undefined,
          raw: body,
        },
      };
    }
    case "payment_request.expiry": {
      if (data.reference_id?.includes(CARD_REF_MARKER)) return { kind: "ignored", event, reason: "SESSION_INNER_PAYMENT" };
      const providerRef = need(data.payment_request_id, "payment_request_id");
      return { kind: "event", result: { eventId: `xendit:${event}:${providerRef}`, providerRef, status: "EXPIRED", raw: body } };
    }
    case "payment_session.completed":
    case "payment_session.expired": {
      const providerRef = need(data.payment_session_id, "payment_session_id");
      const paid = event === "payment_session.completed";
      return {
        kind: "event",
        result: {
          eventId: `xendit:${event}:${providerRef}`,
          providerRef,
          status: paid ? "PAID" : "EXPIRED",
          paidAt: paid ? (date(data.updated) ?? date(env.created) ?? new Date()) : undefined,
          raw: body,
        },
      };
    }
    default:
      return { kind: "ignored", event, reason: "UNHANDLED_EVENT" };
  }
}

/** Reads, verifies and parses a webhook Request. Throws XenditWebhookError / XenditIgnoredEventError. */
export async function readXenditWebhook(req: Request, callbackToken: string): Promise<ParsedXenditEvent> {
  if (!verifyCallbackToken(req.headers.get(XENDIT_CALLBACK_HEADER), callbackToken)) {
    throw new XenditWebhookError("Invalid x-callback-token");
  }
  const raw = await req.text();
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    throw new XenditWebhookError("Malformed Xendit webhook body");
  }
  return parseXenditEvent(body);
}

/**
 * For POST /api/webhooks/payment: answers 200 for authentic events we deliberately ignore, so Xendit
 * does not retry them for 24 h. Returns null for everything else (normal processing, incl. 401 on a bad token).
 */
export async function xenditWebhookPreflight(req: Request, callbackToken: string | undefined): Promise<Response | null> {
  if (!callbackToken) return null;
  try {
    const parsed = await readXenditWebhook(req.clone(), callbackToken);
    if (parsed.kind === "ignored") {
      return Response.json({ ok: true, duplicate: false, ignored: parsed.reason, event: parsed.event });
    }
  } catch {
    // invalid token / malformed body → let the normal path answer (401)
  }
  return null;
}
