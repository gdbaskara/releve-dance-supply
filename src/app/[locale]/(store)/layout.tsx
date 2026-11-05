import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { DemoBanner } from "@/components/store/demo-banner";
import { Footer, type FooterColumn } from "@/components/store/footer";
import { WhatsAppButton } from "@/components/store/whatsapp-button";
import { StoreHeader } from "@/components/store/containers/store-header";
import { CartDrawerContainer } from "@/components/store/containers/cart-drawer-container";
import { LocaleSwitch } from "@/components/store/containers/locale-switch";
import { buildWaLink } from "@/lib/wa";
import type { Locale } from "@/lib/contracts";

/** Store chrome (docs/08 §2): DemoBanner · sticky header + mega menu · footer · WA FAB · cart drawer. */
export default async function StoreLayout({ children, params }: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("nav");
  const waHref = buildWaLink("general", undefined, locale as Locale);
  const demo = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

  const columns: FooterColumn[] = [
    {
      title: t("footer.shop"),
      links: [
        { label: t("items.shoes"), href: "/c/shoes" },
        { label: t("items.pointe"), href: "/c/pointe" },
        { label: t("items.dancewear"), href: "/c/dancewear" },
        { label: t("items.kids"), href: "/c/kids" },
        { label: t("footer.sizeGuide"), href: "/size-guide" },
      ],
    },
    {
      title: t("footer.help"),
      links: [
        { label: t("footer.shipping"), href: "/info/shipping" },
        { label: t("footer.payment"), href: "/info/payment" },
        { label: t("footer.faq"), href: "/info/faq" },
        { label: t("footer.track"), href: "/track" },
      ],
    },
    {
      title: t("footer.about"),
      links: [
        { label: t("footer.aboutUs"), href: "/info/about" },
        { label: t("footer.terms"), href: "/info/terms" },
        { label: t("footer.privacy"), href: "/info/privacy" },
      ],
    },
  ];

  return (
    <>
      <a
        href="#main"
        className="sr-only z-50 bg-ink px-4 py-3 text-sm font-semibold text-ink-inverse focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        {t("skipToContent")}
      </a>
      {demo ? <DemoBanner /> : null}
      <StoreHeader />
      <main id="main" className="min-h-[60dvh]">
        {children}
      </main>
      <Footer
        columns={columns}
        linkAs={Link}
        contact={
          <>
            <h2 className="eyebrow text-ink">{t("footer.contact")}</h2>
            <WhatsAppButton href={waHref} variant="link" label={t("footer.waChat")} />
            <p className="text-ink-muted">{t("footer.address")}</p>
            <p className="text-ink-muted">{t("footer.hours")}</p>
          </>
        }
        bottomSlot={<LocaleSwitch />}
      />
      <WhatsAppButton href={waHref} variant="fab" />
      <CartDrawerContainer />
    </>
  );
}
