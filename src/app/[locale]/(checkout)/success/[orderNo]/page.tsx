import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getOrderForPayPage } from "@/lib/services/order";
import { orderNoSchema } from "@/lib/services/schemas";
import { buildWaLink } from "@/lib/wa";
import { SuccessView } from "@/components/checkout/containers/success-view";
import { PayNotFound } from "@/components/checkout/containers/pay-not-found";

type Props = { params: Promise<{ locale: string; orderNo: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "order" });
  return { title: t("success.metaTitle"), robots: { index: false } };
}

/** ORD-02 — /[locale]/success/[orderNo]. Unpaid orders go back to the pay page. */
export default async function SuccessPage({ params }: Props) {
  const { locale: raw, orderNo: rawNo } = await params;
  const locale = raw === "en" ? "en" : "id";
  setRequestLocale(locale);
  const no = orderNoSchema.safeParse(decodeURIComponent(rawNo));
  const order = no.success ? await getOrderForPayPage(no.data) : null;
  if (!order) return <PayNotFound waHref={buildWaLink("general", undefined, locale)} />;
  if (order.status === "PENDING_PAYMENT" || order.status === "EXPIRED" || (order.status === "CANCELLED" && !order.paidAt)) {
    redirect(`/${locale}/pay/${order.orderNo}`);
  }
  return <SuccessView order={order} waHref={buildWaLink("order", { orderNo: order.orderNo }, locale)} />;
}
