"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import type { Locale } from "@/lib/contracts";
import { cn } from "@/lib/utils/cn";

export interface LanguageToggleProps {
  /** Current locale. */
  locale: Locale;
  /** Links for each locale (same page in the other language). Preferred — works without JS. */
  hrefs?: Partial<Record<Locale, string>>;
  /** Or a callback (e.g. router.replace(pathname, { locale })). */
  onChange?: (locale: Locale) => void;
  linkAs?: React.ElementType;
  className?: string;
}

const LOCALES: Locale[] = ["id", "en"];

/** "ID / EN" segmented toggle, 12px UPPERCASE; 44px targets. */
export function LanguageToggle({ locale, hrefs, onChange, linkAs: LinkComp = "a", className }: LanguageToggleProps) {
  const t = useTranslations("common");
  return (
    <div role="group" aria-label={t("lang.label")} className={cn("inline-flex items-center", className)}>
      {LOCALES.map((l, i) => {
        const active = l === locale;
        const cls = cn(
          "eyebrow inline-flex min-h-11 min-w-9 items-center justify-center rounded-sm px-1.5 transition-colors",
          "focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-focus",
          active ? "text-ink underline decoration-1 underline-offset-[6px]" : "text-ink-muted hover:text-ink",
        );
        const label = t(`lang.${l}`);
        const full = t(`lang.${l}Full`);
        return (
          <React.Fragment key={l}>
            {i > 0 ? (
              <span aria-hidden className="text-xs text-border-strong">
                /
              </span>
            ) : null}
            {hrefs?.[l] && !active ? (
              <LinkComp href={hrefs[l]} hrefLang={l} lang={l} aria-label={full} className={cls}>
                {label}
              </LinkComp>
            ) : (
              <button
                type="button"
                lang={l}
                aria-label={full}
                aria-pressed={active}
                onClick={() => !active && onChange?.(l)}
                className={cls}
              >
                {label}
              </button>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}
