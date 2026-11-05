import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CheckoutForm } from "@/components/checkout/containers/checkout-form";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "checkout" });
  return { title: t("metaTitle"), robots: { index: false } };
}

/** CHK-01..10 — /[locale]/checkout (?link=<token> from an admin checkout link). */
export default async function CheckoutPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale: raw } = await params;
  const locale = raw === "en" ? "en" : "id";
  setRequestLocale(locale);
  const sp = await searchParams;
  const link = typeof sp.link === "string" && sp.link ? sp.link : null;
  return <CheckoutForm key={link ?? "cart"} locale={locale} linkToken={link} />;
}
