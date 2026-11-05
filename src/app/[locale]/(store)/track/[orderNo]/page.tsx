import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { trackOrderAction } from "@/lib/actions/checkout";
import { buildWaLink } from "@/lib/wa";
import { TrackForm } from "@/components/checkout/containers/track-form";
import { TrackDetail } from "@/components/checkout/containers/track-detail";

type Props = {
  params: Promise<{ locale: string; orderNo: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "order" });
  return { title: t("track.metaTitle"), robots: { index: false } };
}

/**
 * ORD-03/04 — /[locale]/track/[orderNo]?wa=<last 4 digits>. Verified (and rate-limited) through trackOrderAction;
 * a wrong number and an unknown order give the same generic message.
 */
export default async function TrackOrderPage({ params, searchParams }: Props) {
  const { locale: raw, orderNo: rawNo } = await params;
  const locale = raw === "en" ? "en" : "id";
  setRequestLocale(locale);
  const t = await getTranslations("order.track");
  const orderNo = decodeURIComponent(rawNo).trim().toUpperCase();
  const sp = await searchParams;
  const wa = typeof sp.wa === "string" ? sp.wa : "";
  const result = wa ? await trackOrderAction(orderNo, wa) : null;
  const order = result && !("error" in result) ? result : null;
  const error = wa && !order ? (result && "error" in result ? "rateLimited" : "notFound") : null;

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-6 px-4 py-10 md:py-16">
      <h1 className="text-[30px] font-semibold leading-9 tracking-[-0.01em]">{t("title")}</h1>
      {order ? (
        <TrackDetail order={order} waHref={buildWaLink("order", { orderNo: order.orderNo }, locale)} />
      ) : (
        <>
          <p className="text-sm text-ink-muted">{t("intro")}</p>
          <TrackForm key={`${orderNo}-${wa}`} defaultOrderNo={/^RDS-\d{6}-[0-9A-Z]{4}$/.test(orderNo) ? orderNo : ""} error={error} />
        </>
      )}
    </div>
  );
}
