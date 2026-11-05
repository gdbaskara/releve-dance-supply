import { getTranslations, setRequestLocale } from "next-intl/server";
import { buildWaLink } from "@/lib/wa";
import type { Locale } from "@/lib/contracts";
import { SizeGuideContent } from "@/components/store/size-guide";
import { pageMetadata } from "@/components/store/containers/seo";

export async function generateMetadata({ params }: PageProps<"/[locale]/size-guide">) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "common.sizeGuide" });
  return pageMetadata({ locale, path: "/size-guide", title: t("title"), description: t("consultBody") });
}

export default async function SizeGuidePage({ params }: PageProps<"/[locale]/size-guide">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("common.sizeGuide");
  return (
    <div className="container-page flex max-w-3xl flex-col gap-6 py-6 lg:gap-8 lg:py-10">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight lg:text-5xl">{t("title")}</h1>
        <p className="text-base text-ink-muted">{t("consultBody")}</p>
      </header>
      <SizeGuideContent waHref={buildWaLink("general", undefined, locale as Locale)} />
    </div>
  );
}
