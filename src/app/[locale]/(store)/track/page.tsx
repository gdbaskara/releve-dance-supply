import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { TrackForm } from "@/components/checkout/containers/track-form";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "order" });
  return { title: t("track.metaTitle") };
}

/** ORD-03 — /[locale]/track */
export default async function TrackPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale === "en" ? "en" : "id");
  const t = await getTranslations("order.track");
  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-10 md:py-16">
      <div className="flex flex-col gap-2">
        <h1 className="text-[30px] font-semibold leading-9 tracking-[-0.01em]">{t("title")}</h1>
        <p className="text-sm text-ink-muted">{t("intro")}</p>
      </div>
      <TrackForm />
    </div>
  );
}
