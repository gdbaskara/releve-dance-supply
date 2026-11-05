import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { buildWaLink } from "@/lib/wa";
import type { Locale } from "@/lib/contracts";
import { Accordion } from "@/components/ui/accordion";
import { WhatsAppButton } from "@/components/store/whatsapp-button";
import { pageMetadata } from "@/components/store/containers/seo";
import { INFO_SLUGS, type InfoSlug } from "@/components/store/containers/format";

const isInfo = (s: string): s is InfoSlug => (INFO_SLUGS as readonly string[]).includes(s);

export async function generateMetadata({ params }: PageProps<"/[locale]/info/[slug]">) {
  const { locale, slug } = await params;
  if (!isInfo(slug)) return {};
  const t = await getTranslations({ locale, namespace: "info.pages" });
  return pageMetadata({ locale, path: `/info/${slug}`, title: t(`${slug}.title`), description: t(`${slug}.description`) });
}

export default async function InfoPage({ params }: PageProps<"/[locale]/info/[slug]">) {
  const { locale, slug } = await params;
  if (!isInfo(slug)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("info");
  const tn = await getTranslations("nav.footer");
  const sections = t.raw(`pages.${slug}.sections`) as { title: string; body: string }[];
  const nav: { slug: InfoSlug; label: string }[] = [
    { slug: "shipping", label: tn("shipping") },
    { slug: "payment", label: tn("payment") },
    { slug: "faq", label: tn("faq") },
    { slug: "terms", label: tn("terms") },
    { slug: "privacy", label: tn("privacy") },
    { slug: "about", label: tn("aboutUs") },
  ];

  return (
    <div className="container-page grid gap-8 py-6 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-16 lg:py-10">
      <nav aria-label={t("nav")} className="order-last lg:order-first">
        <p className="eyebrow mb-2 text-ink-muted">{t("nav")}</p>
        <ul className="flex flex-col border-t border-border">
          {nav.map((n) => (
            <li key={n.slug} className="border-b border-border">
              <Link
                href={`/info/${n.slug}`}
                aria-current={n.slug === slug ? "page" : undefined}
                className="flex min-h-11 items-center text-sm text-ink-muted hover:text-ink aria-[current=page]:font-semibold aria-[current=page]:text-ink"
              >
                {n.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <article className="flex max-w-[70ch] flex-col gap-6">
        <header className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold tracking-tight lg:text-5xl">{t(`pages.${slug}.title`)}</h1>
          <p className="text-base text-ink-muted">{t(`pages.${slug}.description`)}</p>
        </header>
        {slug === "faq" ? (
          <Accordion
            headerStyle="text"
            items={sections.map((s, i) => ({ value: `q${i}`, title: s.title, content: <p className="text-sm leading-6 text-ink">{s.body}</p> }))}
          />
        ) : (
          <div className="flex flex-col gap-6">
            {sections.map((s) => (
              <section key={s.title} className="flex flex-col gap-2">
                <h2 className="text-xl font-semibold">{s.title}</h2>
                <p className="text-base text-ink">{s.body}</p>
              </section>
            ))}
          </div>
        )}
        <p className="text-xs text-ink-muted">{t("updated")}</p>
        <div className="flex flex-col items-start gap-3 rounded-md bg-surface-alt p-5">
          <p className="text-sm text-ink">{t("askWa")}</p>
          <WhatsAppButton href={buildWaLink("general", undefined, locale as Locale)} />
        </div>
      </article>
    </div>
  );
}
