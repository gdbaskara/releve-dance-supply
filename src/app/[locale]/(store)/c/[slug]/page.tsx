import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { SearchX } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { buildWaLink } from "@/lib/wa";
import type { Locale } from "@/lib/contracts";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/store/empty-state";
import { WhatsAppButton } from "@/components/store/whatsapp-button";
import { ListingShell } from "@/components/store/containers/listing-shell";
import { ProductGrid } from "@/components/store/containers/product-grid";
import { loadListing, parseQuery } from "@/components/store/containers/catalog-query";
import { resolveCollection } from "@/components/store/containers/format";
import { pageMetadata } from "@/components/store/containers/seo";

type TitleKey = "ballet.title";

export async function generateMetadata({ params, searchParams }: PageProps<"/[locale]/c/[slug]">) {
  const { locale, slug } = await params;
  const sp = await searchParams;
  const col = resolveCollection(slug);
  if (!col) return {};
  const t = await getTranslations({ locale, namespace: "catalog.collections" });
  const filtered = Object.keys(sp).some((k) => k !== "sort");
  return pageMetadata({
    locale,
    path: `/c/${slug}`,
    title: t(`${slug}.title` as TitleKey),
    description: t(`${slug}.description` as TitleKey),
    noIndex: filtered,
  });
}

export default async function ListingPage({ params, searchParams }: PageProps<"/[locale]/c/[slug]">) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const col = resolveCollection(slug);
  if (!col) notFound();
  const sp = await searchParams;
  const t = await getTranslations("catalog");
  const tc = await getTranslations("common");
  const query = parseQuery(sp);

  const { result, facets, shown } = await loadListing(
    col,
    query,
    {
      facet: (k) => t(`listing.facets.${k}`),
      discipline: (d) => d,
      audience: (a) => t(`listing.audience.${a as "Adult"}`),
      price: (k) => t(`listing.price.${k as "under1m"}`),
      availability: (a) => t(`listing.availability.${a as "READY"}`),
    },
    { showDiscipline: col.aggregate, showAudience: !col.fixedAudience },
  );

  const title = t(`collections.${slug}.title` as TitleKey);
  const waHref = buildWaLink("general", undefined, locale as Locale);

  return (
    <div className="container-page flex flex-col gap-6 py-6 lg:gap-8 lg:py-10">
      <header className="flex flex-col gap-3">
        <Breadcrumb
          label={tc("breadcrumb")}
          linkAs={Link}
          items={[{ label: t("listing.home"), href: "/" }, { label: title }]}
          className="hidden lg:block"
        />
        <h1 className="text-3xl font-semibold tracking-tight lg:text-5xl">{title}</h1>
        <p className="max-w-[70ch] text-base text-ink-muted">{t(`collections.${slug}.description` as TitleKey)}</p>
      </header>
      <ListingShell facets={facets} selected={query.selected} total={result.total} shown={shown} sort={query.sort}>
        {result.items.length ? (
          <ProductGrid items={result.items} />
        ) : (
          <EmptyState
            icon={<SearchX size={40} strokeWidth={1} />}
            title={t("listing.emptyTitle")}
            description={t("listing.emptyBody")}
            actions={
              <>
                <Button asChild variant="secondary">
                  <Link href={`/c/${slug}`}>{t("listing.reset")}</Link>
                </Button>
                <WhatsAppButton href={waHref} />
              </>
            }
          />
        )}
      </ListingShell>
    </div>
  );
}
