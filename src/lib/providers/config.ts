/**
 * Provider configuration from env (WS-7). Read lazily so tests can override process.env.
 * A provider whose env vars are missing throws ProviderConfigError ("… is not configured: missing X, Y")
 * on first use; `validateProviderEnv()` reports every problem at once (call it from a health check / boot script).
 * Secrets are never logged — only the names of missing variables.
 */

export class ProviderConfigError extends Error {
  constructor(
    readonly provider: string,
    readonly missing: string[],
  ) {
    super(`${provider} is not configured: missing ${missing.join(", ")}`);
    this.name = "ProviderConfigError";
  }
}

type Env = Record<string, string | undefined>;

function read(env: Env, name: string): string | undefined {
  const v = env[name]?.trim();
  return v ? v : undefined;
}

function requireVars(env: Env, provider: string, names: string[]): Record<string, string> {
  const missing = names.filter((n) => !read(env, n));
  if (missing.length) throw new ProviderConfigError(provider, missing);
  return Object.fromEntries(names.map((n) => [n, read(env, n)!]));
}

function num(env: Env, name: string): number | undefined {
  const v = read(env, name);
  if (v === undefined) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

// Xendit

export interface XenditConfig {
  secretKey: string;
  callbackToken: string;
  baseUrl: string;
  /** Payments API v3 version header (`api-version`). */
  apiVersion: string;
}

export function xenditConfigFromEnv(env: Env = process.env): XenditConfig {
  const r = requireVars(env, "Xendit payment provider", ["XENDIT_SECRET_KEY", "XENDIT_CALLBACK_TOKEN"]);
  return {
    secretKey: r.XENDIT_SECRET_KEY,
    callbackToken: r.XENDIT_CALLBACK_TOKEN,
    baseUrl: (read(env, "XENDIT_BASE_URL") ?? "https://api.xendit.co").replace(/\/+$/, ""),
    apiVersion: read(env, "XENDIT_API_VERSION") ?? "2024-11-11",
  };
}

// Biteship

export interface BiteshipConfig {
  apiKey: string;
  baseUrl: string;
  /** Comma-separated Biteship courier codes. */
  couriers: string;
  origin: { areaId?: string; postalCode?: number; latitude?: number; longitude?: number };
  /** true = ask Biteship for the courier's insurance fee instead of our 0,25 % rule. */
  useCourierInsurance: boolean;
}

export const DEFAULT_BITESHIP_COURIERS = "jne,jnt,sicepat,anteraja,gojek,grab";

export function biteshipConfigFromEnv(env: Env = process.env): BiteshipConfig {
  const provider = "Biteship shipping provider";
  const r = requireVars(env, provider, ["BITESHIP_API_KEY"]);
  const areaId = read(env, "BITESHIP_ORIGIN_AREA_ID");
  const postal = read(env, "BITESHIP_ORIGIN_POSTAL_CODE");
  if (!areaId && !postal) throw new ProviderConfigError(provider, ["BITESHIP_ORIGIN_AREA_ID or BITESHIP_ORIGIN_POSTAL_CODE"]);
  if (postal && !/^\d{5}$/.test(postal)) throw new ProviderConfigError(provider, ["BITESHIP_ORIGIN_POSTAL_CODE (5 digits)"]);
  return {
    apiKey: r.BITESHIP_API_KEY,
    baseUrl: (read(env, "BITESHIP_BASE_URL") ?? "https://api.biteship.com").replace(/\/+$/, ""),
    couriers: read(env, "BITESHIP_COURIERS") ?? DEFAULT_BITESHIP_COURIERS,
    origin: {
      areaId,
      postalCode: postal ? Number(postal) : undefined,
      latitude: num(env, "BITESHIP_ORIGIN_LATITUDE"),
      longitude: num(env, "BITESHIP_ORIGIN_LONGITUDE"),
    },
    useCourierInsurance: read(env, "BITESHIP_USE_COURIER_INSURANCE") === "true",
  };
}

// WhatsApp Business (Meta Cloud API)

export interface WabaConfig {
  token: string;
  phoneNumberId: string;
  apiVersion: string;
  baseUrl: string;
  /** Prefix of the approved template names, e.g. "releve_" → "releve_order_created". */
  templatePrefix: string;
  /** Meta language codes per store locale. */
  languages: { id: string; en: string };
}

export function wabaConfigFromEnv(env: Env = process.env): WabaConfig {
  const r = requireVars(env, "WhatsApp Business API messaging provider", ["WABA_TOKEN", "WABA_PHONE_NUMBER_ID"]);
  return {
    token: r.WABA_TOKEN,
    phoneNumberId: r.WABA_PHONE_NUMBER_ID,
    apiVersion: read(env, "WABA_API_VERSION") ?? "v26.0",
    baseUrl: (read(env, "WABA_BASE_URL") ?? "https://graph.facebook.com").replace(/\/+$/, ""),
    templatePrefix: read(env, "WABA_TEMPLATE_PREFIX") ?? "releve_",
    languages: { id: read(env, "WABA_LANG_ID") ?? "id", en: read(env, "WABA_LANG_EN") ?? "en" },
  };
}

// All at once

/** Validates the env for the providers selected by PAYMENT_PROVIDER / SHIPPING_PROVIDER / MESSAGING_PROVIDER. */
export function validateProviderEnv(env: Env = process.env): { ok: boolean; problems: string[] } {
  const problems: string[] = [];
  const check = (key: string, allowed: string[], real: string, load: () => unknown) => {
    const value = read(env, key) ?? allowed[0];
    if (!allowed.includes(value)) {
      problems.push(`${key}=${value} is not one of ${allowed.join("|")}`);
      return;
    }
    if (value !== real) return;
    try {
      load();
    } catch (err) {
      problems.push(err instanceof Error ? err.message : String(err));
    }
  };
  check("PAYMENT_PROVIDER", ["mock", "xendit"], "xendit", () => xenditConfigFromEnv(env));
  check("SHIPPING_PROVIDER", ["mock", "biteship"], "biteship", () => biteshipConfigFromEnv(env));
  check("MESSAGING_PROVIDER", ["outbox", "waba"], "waba", () => wabaConfigFromEnv(env));
  return { ok: problems.length === 0, problems };
}
