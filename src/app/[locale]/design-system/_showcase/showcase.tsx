"use client";

import * as React from "react";
import { useLocale, useTranslations } from "next-intl";
import type { Locale } from "@/lib/contracts";
import { ToastProvider } from "@/components/ui/toast";
import { DemoBanner, LanguageToggle, Wordmark } from "@/components/store";
import { Section } from "./frame";
import { Foundations } from "./foundations";
import { Primitives } from "./primitives";
import { StoreSection } from "./store-section";
import { CheckoutSection } from "./checkout-section";
import { Patterns } from "./patterns";
import type { ShowcaseData } from "./mock-data";

const SECTIONS = ["foundations", "primitives", "store", "checkout", "patterns"] as const;

export function Showcase({ data, nowMs }: { data: ShowcaseData; nowMs: number }) {
  const t = useTranslations("designSystem");
  const locale = useLocale() as Locale;
  const hrefs = { id: "/id/design-system", en: "/en/design-system" };

  return (
    <ToastProvider>
      <DemoBanner />
      <div className="sticky top-0 z-30 border-b border-border bg-surface">
        <div className="container-page flex h-14 items-center gap-4">
          <a href="#top" className="shrink-0 rounded-sm focus-visible:outline-2 focus-visible:outline-focus" aria-label={t("nav.top")}>
            <Wordmark size="sm" compact />
          </a>
          <span aria-hidden className="hidden h-5 w-px bg-border md:block" />
          <nav aria-label={t("nav.label")} className="-mx-2 flex min-w-0 flex-1 overflow-x-auto px-2">
            <ul className="flex items-center gap-5 lg:gap-8">
              {SECTIONS.map((s, i) => (
                <li key={s} className="shrink-0">
                  <a href={`#${s}`} className="eyebrow inline-flex min-h-11 items-center gap-1.5 rounded-sm text-ink-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-focus">
                    <span className="tabular text-accent-strong">0{i + 1}</span>
                    {t(`sections.${s}.title`)}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
          <LanguageToggle locale={locale} hrefs={hrefs} className="hidden shrink-0 md:inline-flex" />
        </div>
      </div>

      <main id="top" className="container-page">
        <header className="grid gap-10 py-14 lg:grid-cols-[1.2fr_1fr] lg:items-end lg:py-24">
          <div className="flex flex-col gap-6">
            <span className="eyebrow text-accent-strong">{t("hero.eyebrow")}</span>
            <h1 className="text-4xl font-semibold tracking-tight lg:text-6xl">{t("hero.title")}</h1>
            <p className="font-display text-3xl font-medium italic leading-tight text-ink lg:text-5xl">{t("hero.tagline")}</p>
          </div>
          <div className="flex flex-col gap-6">
            <p className="max-w-[60ch] text-base text-ink-muted">{t("hero.intro")}</p>
            <ul className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              {(["p1", "p2", "p3", "p4", "p5"] as const).map((k, i) => (
                <li key={k} className="flex gap-2">
                  <span className="tabular text-accent-strong">{i + 1}</span>
                  <span>{t(`hero.principles.${k}`)}</span>
                </li>
              ))}
            </ul>
            <div className="flex items-center gap-3 md:hidden">
              <span className="eyebrow text-ink-muted">{t("hero.language")}</span>
              <LanguageToggle locale={locale} hrefs={hrefs} />
            </div>
          </div>
        </header>

        <Section id="foundations" index="01" title={t("sections.foundations.title")} description={t("sections.foundations.description")}>
          <Foundations />
        </Section>
        <Section id="primitives" index="02" title={t("sections.primitives.title")} description={t("sections.primitives.description")}>
          <Primitives provinces={data.provinces} />
        </Section>
        <Section id="store" index="03" title={t("sections.store.title")} description={t("sections.store.description")}>
          <StoreSection data={data} />
        </Section>
        <Section id="checkout" index="04" title={t("sections.checkout.title")} description={t("sections.checkout.description")}>
          <CheckoutSection data={data} nowMs={nowMs} />
        </Section>
        <Section id="patterns" index="05" title={t("sections.patterns.title")} description={t("sections.patterns.description")}>
          <Patterns data={data} nowMs={nowMs} />
        </Section>
      </main>
      <footer className="border-t border-border bg-surface-alt">
        <div className="container-page flex flex-col gap-3 py-10 text-sm text-ink-muted md:flex-row md:items-center md:justify-between">
          <Wordmark size="sm" />
          <p className="max-w-xl text-xs">{t("footer.note")}</p>
        </div>
      </footer>
    </ToastProvider>
  );
}
