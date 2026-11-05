import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getOrderForPayPage } from "@/lib/services/order";
import { orderNoSchema } from "@/lib/services/schemas";
import { buildWaLink } from "@/lib/wa";
import type { OrderStatus } from "@/lib/contracts";
import { PayView } from "@/components/checkout/containers/pay-view";
import { PayNotFound } from "@/components/checkout/containers/pay-not-found";

const PAID_LIKE: OrderStatus[] = ["PAID", "PROCESSING", "SHIPPED", "DELIVERED", "REFUND_PENDING"];

type Props = { params: Promise<{ locale: string; orderNo: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, orderNo } = await params;
  const t = await getTranslations({ locale, namespace: "pay" });
  return { title: t("metaTitle", { orderNo: decodeURIComponent(orderNo).toUpperCase() }), robots: { index: false } };
}

/** PAY-02..10 — /[locale]/pay/[orderNo] (?step=ewallet|3ds for the simulated provider screens). */
export default async function PayPage({ params }: Props) {
  const { locale: raw, orderNo: rawNo } = await params;
  const locale = raw === "en" ? "en" : "id";
  setRequestLocale(locale);
  const no = orderNoSchema.safeParse(decodeURIComponent(rawNo));
  const order = no.success ? await getOrderForPayPage(no.data) : null;
  if (!order) return <PayNotFound waHref={buildWaLink("general", undefined, locale)} />;
  if (PAID_LIKE.includes(order.status)) redirect(`/${locale}/success/${order.orderNo}`);
  return <PayView key={order.orderNo} order={order} locale={locale} demo={process.env.DEMO_MODE === "true"} />;
}
