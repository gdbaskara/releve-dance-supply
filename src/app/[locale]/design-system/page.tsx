import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Showcase } from "./_showcase/showcase";
import { getShowcaseData } from "./_showcase/mock-data";

/**
 * /[locale]/design-system — living showcase of the Relevé design system (replaces Storybook for the
 * demo, decision D-22). Presentational components with realistic mock data from data/**.
 */
export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "designSystem" });
  return { title: t("meta.title"), description: t("meta.description"), robots: { index: false } };
}

export default async function DesignSystemPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const data = getShowcaseData();
  return <Showcase data={data} nowMs={data.nowMs} />;
}
