import { connection } from "next/server";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { getCollections } from "@/lib/services/catalog";
import { buildWaLink } from "@/lib/wa";
import { COLLECTIONS, type Locale } from "@/lib/contracts";
import { Button } from "@/components/ui/button";
import { ColorPreviewCard } from "@/components/store/containers/color-preview-card";
import { ProductImage, ShoePlaceholderArt } from "@/components/store/product-image";
import { pickImage } from "@/lib/services/home-images";
import { cn } from "@/lib/utils/cn";
import { TrustStrip } from "@/components/store/trust-strip";
import { WhatsAppButton } from "@/components/store/whatsapp-button";
import { pageMetadata, jsonLd, siteUrl } from "@/components/store/containers/seo";

export async function generateMetadata({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "catalog.home" });
  return pageMetadata({ locale, path: "/", title: `Relevé Dance Supply · ${t("metaTitle")}`, description: t("metaDescription"), absoluteTitle: true });
}

const TILES = [
  { key: "ballet", href: "/c/ballet", disciplines: ["Ballet"] },
  { key: "pointe", href: "/c/pointe", disciplines: ["Pointe"] },
  { key: "jazz", href: "/c/jazz", disciplines: ["Jazz"] },
  { key: "tap", href: "/c/tap", disciplines: ["Tap"] },
  { key: "ballroom", href: "/c/latin-ballroom", disciplines: ["Latin/Ballroom"] },
  { key: "dancewear", href: "/c/dancewear", disciplines: COLLECTIONS.dancewear as string[] },
] as const;

export default async function HomePage({ params }: PageProps<"/[locale]">) {
  await connection(); // stock shown on home must be fresh (render per request)
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("catalog");
  const { readyStock, kids, disciplineCounts, disciplineImages, heroImage } = await getCollections(8);
  // Product photos when the catalog has them (DEMO_USE_REFERENCE_IMAGES); placeholder art otherwise.
  const tileImage = (ds: readonly string[]) => pickImage(disciplineImages, ds);
  const consultHref = buildWaLink("general", undefined, locale as Locale);
  const countFor = (ds: readonly string[]) => disciplineCounts.filter((f) => ds.includes(f.value)).reduce((n, f) => n + f.count, 0);
  const tileLabel = (key: (typeof TILES)[number]["key"]) =>
    key === "ballroom" || key === "dancewear" ? t(`home.tiles.${key}`) : t(`collections.${key}.title`);

  const org = {
    "@context": "https://schema.org",
    "@type": "Store",
    name: "Relevé Dance Supply",
    url: `${siteUrl()}/${locale}`,
    address: { "@type": "PostalAddress", addressLocality: "Jakarta Selatan", addressRegion: "DKI Jakarta", addressCountry: "ID" },
    currenciesAccepted: "IDR",
    paymentAccepted: "QRIS, E-wallet, Virtual Account, Credit Card, Debit Card",
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(org) }} />

      {/* 1 · Hero */}
      <section className="bg-accent">
        <div className="container-page grid items-center gap-8 py-12 md:grid-cols-2 md:py-16 lg:py-20">
          <div className="flex flex-col items-start gap-5">
            <p className="eyebrow text-accent-strong">{t("home.heroEyebrow")}</p>
            <h1 className="max-w-[16ch] font-display text-4xl font-medium italic text-ink lg:text-6xl">{t("home.heroTagline")}</h1>
            <p className="max-w-md text-base text-ink-muted">{t("home.heroBody")}</p>
            <div className="mt-2 flex w-full flex-col gap-3 md:w-auto md:flex-row lg:flex-row">
              <Button asChild>
                <Link href="/c/shoes">{t("home.heroCta")}</Link>
              </Button>
              <Button asChild variant="secondary" className="bg-transparent">
                <Link href="/size-guide">{t("home.heroConsult")}</Link>
              </Button>
            </div>
          </div>
          <div
            aria-hidden
            className={cn(
              "relative aspect-[4/3] items-center justify-center overflow-hidden bg-surface-alt text-ink-subtle md:flex",
              // A real photo is worth the space on phones too; the line-art placeholder is desktop-only as before.
              heroImage ? "flex" : "hidden",
            )}
          >
            {heroImage ? (
              <ProductImage src={heroImage.url} alt="" priority aspectClassName="absolute inset-0" sizes="(min-width: 768px) 50vw, 100vw" />
            ) : (
              <ShoePlaceholderArt className="w-3/4 text-accent-strong" />
            )}
            <span className="eyebrow absolute bottom-4 left-4 bg-surface px-2 py-1 text-ink-subtle">Só Dança</span>
          </div>
        </div>
      </section>

      {/* 2 · Shop by discipline */}
      <section aria-labelledby="h-disc" className="container-page py-12 lg:py-20">
        <h2 id="h-disc" className="mb-6 text-2xl font-semibold tracking-tight lg:mb-8 lg:text-3xl">
          {t("home.byDiscipline")}
        </h2>
        <ul className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6 lg:gap-6">
          {TILES.map((tile) => (
            <li key={tile.key}>
              <Link
                href={tile.href}
                className="group flex flex-col gap-3 rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus"
              >
                <div className="relative flex aspect-square items-center justify-center overflow-hidden bg-surface-alt text-ink-subtle transition-colors group-hover:bg-accent">
                  {tileImage(tile.disciplines) ? (
                    <ProductImage
                      src={tileImage(tile.disciplines)?.url}
                      alt=""
                      aspectClassName="absolute inset-0"
                      className="transition-transform duration-300 motion-safe:group-hover:scale-105"
                      sizes="(min-width: 1024px) 16vw, (min-width: 768px) 33vw, 50vw"
                    />
                  ) : (
                    <ShoePlaceholderArt className="w-2/3" />
                  )}
                </div>
                <div className="flex items-baseline justify-between gap-2">
                  <span className="eyebrow text-ink group-hover:underline group-hover:underline-offset-4">{tileLabel(tile.key)}</span>
                  <span className="text-xs text-ink-muted">{t("home.disciplineCount", { n: countFor(tile.disciplines) })}</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* 3 · Ready in Jakarta carousel */}
      <section aria-labelledby="h-ready" className="border-t border-border py-12 lg:py-20">
        <div className="container-page mb-6 flex flex-wrap items-end justify-between gap-3 lg:mb-8">
          <div className="flex flex-col gap-1">
            <h2 id="h-ready" className="text-2xl font-semibold tracking-tight lg:text-3xl">
              {t("home.readyTitle")}
            </h2>
            <p className="text-sm text-ink-muted">{t("home.readyBody")}</p>
          </div>
          <Link href="/c/shoes?availability=READY" className="inline-flex min-h-11 items-center gap-1 text-sm font-medium text-ink underline underline-offset-[3px] hover:text-accent-strong">
            {t("home.seeAllReady")}
            <ArrowRight size={16} strokeWidth={1.5} aria-hidden />
          </Link>
        </div>
        <div className="container-page">
          <ul className="relative -mx-[var(--gutter)] flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-px-[var(--gutter)] px-[var(--gutter)] pb-4 lg:gap-8">
            {readyStock.map((p, i) => (
              <li key={p.slug} className="w-[44%] shrink-0 snap-start md:w-[30%] lg:w-[calc(25%-1.5rem)]">
                <ColorPreviewCard product={p} priority={i < 2} />
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* 4 · Size consultation banner */}
      <section className="container-page pb-12 lg:pb-20">
        <div className="grid overflow-hidden rounded-md md:grid-cols-2">
          <div className="flex flex-col items-start gap-4 bg-accent p-6 md:p-10">
            <p className="eyebrow text-accent-ink">{t("home.consultTitle")}</p>
            <p className="font-display text-3xl font-medium italic leading-9 text-ink lg:text-4xl">{t("home.consultBody")}</p>
            <div className="mt-2 flex flex-col items-start gap-3 lg:flex-row lg:items-center">
              <WhatsAppButton href={consultHref} label={t("home.consultCta")} />
              <Link href="/size-guide" className="inline-flex min-h-11 items-center text-sm font-medium text-ink underline underline-offset-[3px]">
                {t("home.consultGuide")}
              </Link>
            </div>
          </div>
          <div aria-hidden className="hidden items-center justify-center bg-surface-alt p-10 text-ink-subtle md:flex">
            <svg viewBox="0 0 160 120" className="h-48 w-auto text-ink" fill="none" stroke="currentColor" strokeWidth={1.5}>
              <rect x="20" y="8" width="70" height="104" className="fill-surface" />
              <path d="M20 8h70" strokeWidth={3} />
              <path d="M55 14c-12 0-20 9-21 22-1 14 3 24 3 36 0 12-4 18-4 26 0 8 6 12 13 12s12-5 12-13c0-10-2-18 2-30 3-10 7-22 7-32 0-12-5-21-12-21Z" />
              <path d="M108 14v92M104 18l4-4 4 4M104 102l4 4 4-4" className="text-accent-strong" stroke="currentColor" />
            </svg>
          </div>
        </div>
      </section>

      {/* 5 · Kids */}
      <section aria-labelledby="h-kids" className="border-t border-border py-12 lg:py-20">
        <div className="container-page">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3 lg:mb-8">
            <div className="flex flex-col gap-1">
              <h2 id="h-kids" className="text-2xl font-semibold tracking-tight lg:text-3xl">
                {t("home.kidsTitle")}
              </h2>
              <p className="text-sm text-ink-muted">{t("home.kidsBody")}</p>
            </div>
            <Link href="/c/kids" className="inline-flex min-h-11 items-center gap-1 text-sm font-medium text-ink underline underline-offset-[3px] hover:text-accent-strong">
              {t("home.seeAllKids")}
              <ArrowRight size={16} strokeWidth={1.5} aria-hidden />
            </Link>
          </div>
          <ul className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6 lg:gap-8">
            {kids.slice(0, 4).map((p) => (
              <li key={p.slug}>
                <ColorPreviewCard product={p} />
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* 6 · Trust strip */}
      <TrustStrip />

      {/* 7 · How to shop */}
      <section aria-labelledby="h-steps" className="container-page py-12 lg:py-20">
        <h2 id="h-steps" className="mb-6 text-2xl font-semibold tracking-tight lg:mb-8 lg:text-3xl">
          {t("home.stepsTitle")}
        </h2>
        <ol className="grid gap-6 md:grid-cols-3 md:gap-8">
          {(["1", "2", "3"] as const).map((n) => (
            <li key={n} className="flex gap-4 border-t border-ink pt-5">
              <span className="tabular font-display text-4xl italic leading-none text-accent-strong">{n}</span>
              <div className="flex flex-col gap-1">
                <h3 className="text-base font-semibold">{t(`home.steps.${n}.title`)}</h3>
                <p className="text-sm text-ink-muted">{t(`home.steps.${n}.body`)}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>
    </>
  );
}
