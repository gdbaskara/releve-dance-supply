"use client";
/** I18N-02: ID / EN toggle that keeps the current path and query string. */
import * as React from "react";
import { useSearchParams } from "next/navigation";
import { useLocale } from "next-intl";
import { usePathname } from "@/i18n/navigation";
import { LanguageToggle } from "@/components/store/language-toggle";
import type { Locale } from "@/lib/contracts";

function Toggle({ query, className }: { query: string; className?: string }) {
  const locale = useLocale() as Locale;
  const pathname = usePathname();
  const path = pathname === "/" ? "" : pathname;
  const q = query ? `?${query}` : "";
  return (
    <LanguageToggle
      locale={locale}
      hrefs={{ id: `/id${path}${q}`, en: `/en${path}${q}` }}
      className={className}
    />
  );
}

function WithQuery({ className }: { className?: string }) {
  const sp = useSearchParams();
  return <Toggle query={sp.toString()} className={className} />;
}

export function LocaleSwitch({ className }: { className?: string }) {
  return (
    <React.Suspense fallback={<Toggle query="" className={className} />}>
      <WithQuery className={className} />
    </React.Suspense>
  );
}
