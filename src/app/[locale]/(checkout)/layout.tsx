import { Suspense } from "react";
import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Wordmark } from "@/components/store/wordmark";
import { DemoBanner } from "@/components/store/demo-banner";
import { WhatsAppButton } from "@/components/store/whatsapp-button";
import { LocaleSwitch } from "@/components/checkout/containers/locale-switch";
import { buildWaLink } from "@/lib/wa";
import type { Locale } from "@/lib/contracts";

/** Minimal checkout / pay / success chrome: wordmark (home), "Butuh bantuan? WA", ID/EN. No WA FAB here (WA-02). */
export default async function CheckoutLayout({ children, params }: LayoutProps<"/[locale]">) {
  const { locale: raw } = await params;
  const locale: Locale = raw === "en" ? "en" : "id";
  setRequestLocale(locale);
  const t = await getTranslations("common");
  const demo = process.env.NEXT_PUBLIC_DEMO_MODE === "true";
  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      {demo ? <DemoBanner /> : null}
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex h-[var(--header-h)] max-w-[1280px] items-center justify-between gap-3 px-4 lg:px-8">
          <Link href="/" aria-label={t("header.home")} className="rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus">
            <Wordmark size="sm" className="md:hidden" />
            <Wordmark size="md" className="hidden md:inline-flex" />
          </Link>
          <div className="flex items-center gap-2 md:gap-4">
            <WhatsAppButton href={buildWaLink("general", undefined, locale)} variant="link" label={t("wa.help")} className="text-xs md:text-sm" />
            <Suspense fallback={null}>
              <LocaleSwitch />
            </Suspense>
          </div>
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
