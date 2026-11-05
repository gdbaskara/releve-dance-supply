/**
 * Admin UI locale (docs/10 D-31): chosen by the `admin_locale` cookie, not by URL prefix, so every /admin URL
 * stays unchanged. Pure & client-safe; the server-side cookie read lives in ./admin-locale.server.ts.
 */
import type { Locale } from "@/lib/contracts";

export const ADMIN_LOCALE_COOKIE = "admin_locale";
export const ADMIN_LOCALES: readonly Locale[] = ["id", "en"];
export const DEFAULT_ADMIN_LOCALE: Locale = "id";
/** One year: a UI preference, not a session. */
export const ADMIN_LOCALE_MAX_AGE = 60 * 60 * 24 * 365;

export function isAdminLocale(value: unknown): value is Locale {
  return typeof value === "string" && (ADMIN_LOCALES as readonly string[]).includes(value);
}

/** Cookie / form value -> admin locale. Anything unknown (missing, "fr", " EN ", arrays...) falls back to "id". */
export function parseAdminLocale(value: unknown): Locale {
  return isAdminLocale(value) ? value : DEFAULT_ADMIN_LOCALE;
}

/** BCP 47 tag for Intl number formatting of non-money values (multipliers, percentages). */
export function adminNumberLocale(locale: Locale): string {
  return locale === "en" ? "en-US" : "id-ID";
}
