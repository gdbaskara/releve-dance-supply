import * as React from "react";
import { useLocale, useTranslations } from "next-intl";
import { setAdminLocaleAction } from "@/lib/actions/admin-locale";
import { ADMIN_LOCALES } from "@/i18n/admin-locale";
import { cn } from "@/lib/utils/cn";

/**
 * Admin "ID / EN" switch (D-31), styled like the storefront LanguageToggle (12px uppercase, 44px targets).
 * A plain form posting to a server action: each language is a submit button, so it works without JS and with
 * the keyboard (Tab + Enter/Space). The action sets the `admin_locale` cookie and refreshes the page in place;
 * the URL does not change. Renders in both server (login page) and client (AdminNav) trees.
 */
export function AdminLocaleToggle({ className }: { className?: string }) {
  const locale = useLocale();
  const t = useTranslations("common.lang");
  const ta = useTranslations("admin.locale");
  return (
    <form action={setAdminLocaleAction} role="group" aria-label={ta("label")} className={cn("inline-flex items-center", className)}>
      {ADMIN_LOCALES.map((l, i) => {
        const active = l === locale;
        return (
          <React.Fragment key={l}>
            {i > 0 ? (
              <span aria-hidden className="text-xs text-border-strong">
                /
              </span>
            ) : null}
            <button
              type="submit"
              name="locale"
              value={l}
              lang={l}
              aria-label={t(`${l}Full`)}
              aria-current={active ? "true" : undefined}
              data-testid={`admin-locale-${l}`}
              className={cn(
                "eyebrow inline-flex min-h-11 min-w-9 items-center justify-center rounded-sm px-1.5 transition-colors",
                "focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-focus",
                active ? "text-ink underline decoration-1 underline-offset-[6px]" : "text-ink-muted hover:text-ink",
              )}
            >
              {t(l)}
            </button>
          </React.Fragment>
        );
      })}
    </form>
  );
}
