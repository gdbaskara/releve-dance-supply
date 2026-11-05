/**
 * SEO helpers (NFR-04): absolute URLs + hreflang alternates for id/en. Pure.
 */
import type { Metadata } from "next";

export const LOCALES = ["id", "en"] as const;

export function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

/** `path` is locale-less and starts with "/" ("/" for home). */
export function localeUrl(locale: string, path: string): string {
  const p = path === "/" ? "" : path;
  return `${siteUrl()}/${locale}${p}`;
}

export function alternatesFor(locale: string, path: string): NonNullable<Metadata["alternates"]> {
  return {
    canonical: localeUrl(locale, path),
    languages: {
      id: localeUrl("id", path),
      en: localeUrl("en", path),
      "x-default": localeUrl("id", path),
    },
  };
}

/** Standard page metadata: title, description, canonical + hreflang, OpenGraph basics. */
export function pageMetadata(opts: {
  locale: string;
  path: string;
  title: string;
  description: string;
  absoluteTitle?: boolean;
  noIndex?: boolean;
}): Metadata {
  return {
    title: opts.absoluteTitle ? { absolute: opts.title } : opts.title,
    description: opts.description,
    alternates: alternatesFor(opts.locale, opts.path),
    openGraph: {
      title: opts.title,
      description: opts.description,
      url: localeUrl(opts.locale, opts.path),
      siteName: "Relevé Dance Supply",
      locale: opts.locale === "id" ? "id_ID" : "en_US",
      type: "website",
    },
    ...(opts.noIndex ? { robots: { index: false, follow: true } } : {}),
  };
}

/** JSON for <script type="application/ld+json"> with `<` escaped (XSS-safe). */
export function jsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
