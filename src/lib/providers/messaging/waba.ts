/**
 * WhatsApp Business messaging provider (WA-06) — Meta WhatsApp Cloud API. Server-only.
 *
 * POST {WABA_BASE_URL}/{WABA_API_VERSION}/{WABA_PHONE_NUMBER_ID}/messages, `Authorization: Bearer WABA_TOKEN`,
 * body = template message with positional BODY parameters (waba-templates.ts), language `id` / `en`.
 * Every attempt is also written to `wa_outbox` (status SENT or FAILED, body = the id/en text from
 * src/lib/wa/templates.ts) so Admin → WA Outbox keeps working. On failure the error is re-thrown;
 * services/notify.ts logs it and never breaks the order flow.
 *
 * Opt-in (WA-05) is enforced by the callers (notifyOrder checks waOptIn; PAYMENT_INSTRUCTIONS and
 * BACK_IN_STOCK are sent because the buyer asked for them).
 * ASSUMPTION: "SENT" means Meta accepted the message (HTTP 200 + wamid); delivery/read receipts arrive by
 * webhook, which is not wired up yet (no status column for it in wa_outbox).
 */
import type { Locale, MessageTemplate, MessagingProvider } from "@/lib/contracts";
import { renderNotification } from "@/lib/wa/templates";
import { db as defaultDb, type DB } from "@/db";
import { waOutbox } from "@/db/schema";
import { wabaConfigFromEnv, type WabaConfig } from "../config";
import { requestJson, type FetchLike } from "../http";
import { WABA_TEMPLATES, templateParams } from "./waba-templates";

export interface WabaSendResponse {
  messaging_product?: string;
  contacts?: { input?: string; wa_id?: string }[];
  messages?: { id: string; message_status?: string }[];
}

function metaError(body: unknown): { code?: string; message?: string } {
  const e = (body as { error?: { code?: number; error_subcode?: number; message?: string; error_data?: { details?: string } } } | null)?.error;
  if (!e) return {};
  return {
    code: e.code !== undefined ? String(e.code) : undefined,
    message: [e.message, e.error_data?.details].filter(Boolean).join(" — ") || undefined,
  };
}

/** Builds the Cloud API request body (exported for tests / previews). */
export function buildWabaTemplateBody(
  to: string,
  template: MessageTemplate,
  locale: Locale,
  vars: Record<string, string>,
  cfg: Pick<WabaConfig, "templatePrefix" | "languages">,
) {
  const params = templateParams(template, vars);
  return {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: to.replace(/\D/g, ""), // E.164 without "+"
    type: "template",
    template: {
      name: `${cfg.templatePrefix}${WABA_TEMPLATES[template].name}`,
      language: { code: cfg.languages[locale] },
      components: params.length ? [{ type: "body", parameters: params.map((text) => ({ type: "text", text })) }] : [],
    },
  };
}

export interface WabaProviderOptions {
  config?: WabaConfig;
  fetchImpl?: FetchLike;
  db?: DB;
}

export class WabaMessagingProvider implements MessagingProvider {
  readonly name = "waba" as const;
  private cfg?: WabaConfig;

  constructor(private readonly opts: WabaProviderOptions = {}) {
    this.cfg = opts.config;
  }

  private config(): WabaConfig {
    this.cfg ??= wabaConfigFromEnv();
    return this.cfg;
  }

  async send(to: string, template: MessageTemplate, locale: Locale, vars: Record<string, string>, orderId?: string): Promise<void> {
    const cfg = this.config(); // throws ProviderConfigError before anything is recorded
    const body = buildWabaTemplateBody(to, template, locale, vars, cfg);
    let error: unknown = null;
    try {
      const res = await requestJson<WabaSendResponse>({
        provider: "waba",
        url: `${cfg.baseUrl}/${cfg.apiVersion}/${encodeURIComponent(cfg.phoneNumberId)}/messages`,
        method: "POST",
        headers: { authorization: `Bearer ${cfg.token}` },
        body,
        timeoutMs: 10_000,
        fetchImpl: this.opts.fetchImpl,
        errorOf: metaError,
      });
      if (!res?.messages?.[0]?.id) throw new Error("WhatsApp Cloud API response without message id");
    } catch (err) {
      error = err;
    }
    await (this.opts.db ?? defaultDb).insert(waOutbox).values({
      toWa: to,
      template,
      locale,
      body: renderNotification(template, locale, vars),
      orderId: orderId ?? null,
      status: error ? "FAILED" : "SENT",
    });
    if (error) throw error;
  }
}
