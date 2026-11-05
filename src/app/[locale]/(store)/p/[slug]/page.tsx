import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getProduct, getRelated } from "@/lib/services/catalog";
import { formatIDR } from "@/lib/format";
import type { ProductDetail } from "@/lib/contracts";
import { Accordion } from "@/components/ui/accordion";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Price } from "@/components/store/price";
import { TrustStrip } from "@/components/store/trust-strip";
import { CompareStyles, type CompareItem } from "@/components/store/compare-styles";
import { PdpClient } from "@/components/store/containers/pdp-client";
import { ProductGrid } from "@/components/store/containers/product-grid";
import { disciplineSlug, materialOf, soleOf } from "@/components/store/containers/format";
import { jsonLd, localeUrl, pageMetadata } from "@/components/store/containers/seo";

export async function generateMetadata({ params }: PageProps<"/[locale]/p/[slug]">) {
  const { locale, slug } = await params;
  const product = await getProduct(slug);
  if (!product) return {};
  const t = await getTranslations({ locale, namespace: "pdp" });
  const meta = pageMetadata({
    locale,
    path: `/p/${slug}`,
    title: `${product.name} ${product.modelCode}`,
    description: t("metaDescription", { name: product.name, code: product.modelCode, price: formatIDR(product.priceIdr) }),
  });
  return product.images[0] ? { ...meta, openGraph: { ...meta.openGraph, images: [product.images[0].url] } } : meta;
}

const AVAILABILITY = {
  READY: "https://schema.org/InStock",
  LOW: "https://schema.org/LimitedAvailability",
  PREORDER: "https://schema.org/PreOrder",
  SOLD_OUT: "https://schema.org/OutOfStock",
} as const;

export default async function ProductPage({ params, searchParams }: PageProps<"/[locale]/p/[slug]">) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const product = await getProduct(slug);
  if (!product) notFound();
  const sp = await searchParams;
  const t = await getTranslations("pdp");
  const tc = await getTranslations("common");
  const tcat = await getTranslations("catalog");
  const loc = locale as "id" | "en";

  const related = await getRelated(slug, 6);
  const isShoe = product.group === "shoes" || product.group === "pointe";
  const compareCandidates = related
    .filter((r) => r.discipline === product.discipline && r.modelCode !== product.modelCode)
    .slice(0, 2);
  const compareDetails = isShoe
    ? (await Promise.all(compareCandidates.map((r) => getProduct(r.slug)))).filter((p): p is ProductDetail => !!p)
    : [];
  const toCompare = (p: ProductDetail, current = false): CompareItem => ({
    name: p.name,
    modelCode: p.modelCode,
    imageUrl: p.images[0]?.url ?? null,
    href: `/p/${p.slug}`,
    sole: t(`sole.${soleOf(p)}`),
    material: materialOf(p, loc) ?? t("material.unknown"),
    priceIdr: p.priceIdr,
    current,
  });
  const compare = compareDetails.length ? [toCompare(product, true), ...compareDetails.map((p) => toCompare(p))] : [];
  const mayLike = related.slice(0, 4);

  const productUrl = localeUrl(locale, `/p/${slug}`);
  const colSlug = disciplineSlug(product.discipline);
  const description = loc === "id" ? (product.descriptionId ?? product.descriptionEn) : product.descriptionEn;
  const features = loc === "id" ? product.featuresId : product.featuresEn;
  const material = materialOf(product, loc);
  const care = t(`care.${product.group}`);
  const initialColor = typeof sp.color === "string" ? sp.color : undefined;

  const ld = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: `${product.name} ${product.modelCode}`,
    sku: product.modelCode,
    mpn: product.modelCode,
    brand: { "@type": "Brand", name: product.brand },
    description: product.descriptionEn,
    category: product.discipline,
    ...(product.images.length ? { image: product.images.map((i) => i.url) } : {}),
    offers: {
      "@type": "Offer",
      url: productUrl,
      priceCurrency: "IDR",
      price: product.priceIdr,
      availability: AVAILABILITY[product.status],
      itemCondition: "https://schema.org/NewCondition",
      seller: { "@type": "Organization", name: "Relevé Dance Supply" },
    },
  };

  const header = (
    <div className="flex flex-col gap-2">
      <Link href={`/c/${colSlug}`} className="eyebrow self-start text-ink-muted hover:text-ink hover:underline">
        {product.discipline}
        {product.audience === "Kids" ? " · Kids" : ""}
      </Link>
      <h1 className="text-3xl font-semibold tracking-tight lg:text-4xl">{product.name}</h1>
      <p className="text-sm text-ink-muted">
        {tc("product.modelCode", { code: product.modelCode })} · {t("brand")}
      </p>
      <Price value={product.priceIdr} size="lg" className="mt-1" />
      <p className="text-xs text-ink-muted">{t("originalLabel")}</p>
    </div>
  );

  const infoLink = (href: string) => (
    <Link href={href} className="mt-2 inline-flex min-h-11 items-center text-sm font-medium text-ink underline underline-offset-[3px]">
      {t("infoLink")}
    </Link>
  );

  return (
    <div className="container-page flex flex-col gap-12 py-4 lg:gap-20 lg:py-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(ld) }} />
      <div className="flex flex-col gap-4">
        <Breadcrumb
          label={tc("breadcrumb")}
          linkAs={Link}
          className="hidden lg:block"
          items={[
            { label: tcat("listing.home"), href: "/" },
            { label: tcat(`collections.${colSlug}.title` as "collections.ballet.title"), href: `/c/${colSlug}` },
            { label: product.name },
          ]}
        />
        <PdpClient product={product} productUrl={productUrl} initialColor={initialColor} header={header}>
          <TrustStrip variant="mini" items={["original", "jakarta", "payment"]} />
          <Accordion
            type="multiple"
            defaultOpen={["description"]}
            items={[
              {
                value: "description",
                title: t("sections.description"),
                content: (
                  <div className="flex flex-col gap-3 text-sm leading-6 text-ink">
                    <p>{description}</p>
                    {loc === "id" && product.descriptionId ? (
                      <div className="flex flex-col gap-1 text-ink-muted">
                        <p className="text-xs font-semibold">{t("sections.descriptionEnNote")}</p>
                        <p lang="en">{product.descriptionEn}</p>
                      </div>
                    ) : null}
                  </div>
                ),
              },
              {
                value: "features",
                title: t("sections.features"),
                content: (
                  <ul className="flex list-disc flex-col gap-1 pl-5 text-sm leading-6">
                    {features.map((f) => (
                      <li key={f}>{f}</li>
                    ))}
                  </ul>
                ),
              },
              {
                value: "material",
                title: t("sections.material"),
                content: (
                  <div className="flex flex-col gap-2 text-sm leading-6">
                    {material ? <p className="font-medium">{material}</p> : null}
                    <p>{care}</p>
                  </div>
                ),
              },
              {
                value: "shipping",
                title: t("sections.shipping"),
                content: (
                  <div className="text-sm leading-6">
                    <p>{t("shippingInfo")}</p>
                    {infoLink("/info/shipping")}
                  </div>
                ),
              },
              {
                value: "payment",
                title: t("sections.payment"),
                content: (
                  <div className="text-sm leading-6">
                    <p>{t("paymentInfo")}</p>
                    {infoLink("/info/payment")}
                  </div>
                ),
              },
            ]}
          />
        </PdpClient>
      </div>

      {compare.length > 1 ? <CompareStyles items={compare} title={t("compareTitle")} linkAs={Link} /> : null}

      {mayLike.length ? (
        <section aria-labelledby="h-related" className="flex flex-col gap-6">
          <h2 id="h-related" className="text-2xl font-semibold tracking-tight">
            {t("relatedTitle")}
          </h2>
          <ProductGrid items={mayLike} withSidebar={false} />
        </section>
      ) : null}
    </div>
  );
}
