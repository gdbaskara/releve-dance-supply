import { getTranslations, setRequestLocale } from "next-intl/server";
import { SearchX } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { buildWaLink } from "@/lib/wa";
import type { Locale } from "@/lib/contracts";
import { EmptyState } from "@/components/store/empty-state";
import { WhatsAppButton } from "@/components/store/whatsapp-button";
import { ListingShell } from "@/components/store/containers/listing-shell";
import { ProductGrid } from "@/components/store/containers/product-grid";
import { SearchForm } from "@/components/store/containers/search-form";
import { loadListing, parseQuery } from "@/components/store/containers/catalog-query";
import { pageMetadata } from "@/components/store/containers/seo";

export async function generateMetadata({ params }: PageProps<"/[locale]/search">) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "nav.search" });
  return pageMetadata({ locale, path: "/search", title: t("metaTitle"), description: t("metaDescription"), noIndex: true });
}

const POPULAR = ["SD140", "Bliss", "Alina", "pointe", "tap", "leotard"];

export default async function SearchPage({ params, searchParams }: PageProps<"/[locale]/search">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("nav.search");
  const tc = await getTranslations("catalog.listing");
  const tcommon = await getTranslations("common");
  const query = parseQuery(await searchParams);
  const q = query.q.trim();

  const popular = (
    <div className="flex flex-col gap-3">
      <p className="eyebrow text-ink-muted">{t("popular")}</p>
      <ul className="flex flex-wrap gap-2">
        {POPULAR.map((p) => (
          <li key={p}>
            <Link href={`/search?q=${encodeURIComponent(p)}`} className="inline-flex h-9 items-center rounded-pill border border-border-strong px-4 text-sm text-ink hover:border-ink">
              {p}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );

  let body: React.ReactNode = popular;
  if (q) {
    const { result, facets, shown } = await loadListing(
      null,
      query,
      {
        facet: (k) => tc(`facets.${k}`),
        discipline: (d) => d,
        audience: (a) => tc(`audience.${a as "Adult"}`),
        price: (k) => tc(`price.${k as "under1m"}`),
        availability: (a) => tc(`availability.${a as "READY"}`),
      sizeGroup: (g) => tcommon(`sizeGroups.${g}`),
      },
      { showDiscipline: true, showAudience: true },
    );
    body =
      result.total === 0 && Object.keys(query.selected).length === 0 ? (
        <div className="flex flex-col gap-8">
          <EmptyState
            icon={<SearchX size={40} strokeWidth={1} />}
            title={t("emptyTitle", { q })}
            description={t("emptyBody")}
            actions={<WhatsAppButton href={buildWaLink("general", undefined, locale as Locale)} />}
          />
          {popular}
        </div>
      ) : (
        <ListingShell facets={facets} selected={query.selected} total={result.total} shown={shown} sort={query.sort}>
          {result.items.length ? (
            <ProductGrid items={result.items} />
          ) : (
            <EmptyState icon={<SearchX size={40} strokeWidth={1} />} title={tc("emptyTitle")} description={tc("emptyBody")} />
          )}
        </ListingShell>
      );
  }

  return (
    <div className="container-page flex flex-col gap-6 py-6 lg:gap-8 lg:py-10">
      <header className="flex max-w-2xl flex-col gap-4">
        <h1 className="text-3xl font-semibold tracking-tight lg:text-5xl">{q ? t("resultsFor", { q }) : t("title")}</h1>
        <SearchForm defaultValue={q} action={`/${locale}/search`} />
        {!q ? <p className="text-sm text-ink-muted">{t("hint")}</p> : null}
      </header>
      {body}
    </div>
  );
}
