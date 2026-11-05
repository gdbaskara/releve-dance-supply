"use client";

import { useSearchParams } from "next/navigation";
import { useLocale } from "next-intl";
import { usePathname } from "@/i18n/navigation";
import { LanguageToggle } from "@/components/store/language-toggle";
import type { Locale } from "@/lib/contracts";

/** LanguageToggle for the checkout chrome: same path + query in the other locale (cart lives in localStorage). */
export function LocaleSwitch({ className }: { className?: string }) {
  const locale = (useLocale() === "en" ? "en" : "id") as Locale;
  const pathname = usePathname();
  const params = useSearchParams();
  const qs = params.toString();
  const href = (l: Locale) => `/${l}${pathname === "/" ? "" : pathname}${qs ? `?${qs}` : ""}`;
  return <LanguageToggle locale={locale} hrefs={{ id: href("id"), en: href("en") }} className={className} />;
}
