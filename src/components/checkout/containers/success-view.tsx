import { useTranslations } from "next-intl";
import { CircleCheck, Truck } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { OrderPublicView } from "@/lib/contracts";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";
import { Notice } from "@/components/ui/notice";
import { WhatsAppButton } from "@/components/store/whatsapp-button";
import { OrderSummary } from "../order-summary";
import { OrderTimeline } from "../order-timeline";

export interface SuccessViewProps {
  order: OrderPublicView;
  waHref: string;
}

/** ORD-02 — success page body (server-rendered; client islands for copy & timeline). */
export function SuccessView({ order, waHref }: SuccessViewProps) {
  const t = useTranslations("order.success");
  const tc = useTranslations("common");
  const last4 = /(\d{4})\D*$/.exec(order.customerWaMasked)?.[1];
  const eta = order.shipping.eta.replace("-", "–");
  const etaText = order.shipping.etaUnit === "hours" ? t("etaHours", { eta }) : t("etaDays", { eta });
  const trackHref = `/track/${order.orderNo}${last4 ? `?wa=${last4}` : ""}`;
  return (
    <div className="mx-auto flex w-full max-w-[1080px] flex-col gap-8 px-4 pb-16 pt-8 md:pt-12 lg:grid lg:grid-cols-[minmax(0,1fr)_400px] lg:items-start lg:gap-12">
      <div className="flex flex-col gap-8">
        <div role="status" className="flex flex-col items-center gap-3 text-center lg:items-start lg:text-left">
          <span className="inline-flex size-16 items-center justify-center rounded-pill bg-success-bg text-success">
            <CircleCheck size={32} strokeWidth={1.5} aria-hidden />
          </span>
          <h1 className="text-[30px] font-semibold leading-9 tracking-[-0.01em] lg:text-[40px] lg:leading-[48px]">{t("title")}</h1>
          <p className="max-w-md text-sm text-ink-muted">{t("thanks", { name: order.customerName })}</p>
        </div>

        <div className="flex flex-col gap-3 rounded-md bg-surface-alt p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex flex-col">
              <span className="eyebrow text-ink-muted">{t("orderNo")}</span>
              <span className="tabular font-mono text-lg font-medium tracking-[0.04em]" data-testid="order-no">
                {order.orderNo}
              </span>
            </div>
            <CopyButton value={order.orderNo} ariaLabel={t("copyOrderNo")} />
          </div>
          <p className="border-t border-border pt-3 text-sm">{t("waSent", { wa: order.customerWaMasked })}</p>
        </div>

        <div className="flex flex-col gap-3">
          <p className="flex items-start gap-2 text-sm">
            <Truck size={18} strokeWidth={1.5} aria-hidden className="mt-0.5 shrink-0" />
            <span>{t("shippingEta", { courier: order.shipping.courier, service: order.shipping.service, eta: etaText })}</span>
          </p>
          {order.hasPreorder ? <Notice tone="info">{t("preorderEta")}</Notice> : null}
          <p className="text-sm text-ink-muted">
            <span className="font-medium text-ink">{t("shipTo")}: </span>
            {[order.address.line, order.address.district, order.address.city, order.address.province, order.address.postalCode].filter(Boolean).join(", ")}
          </p>
        </div>

        <section className="flex flex-col gap-4">
          <h2 className="eyebrow">{tc("timeline.title")}</h2>
          <OrderTimeline entries={order.timeline} tracking={order.tracking} />
        </section>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Button asChild className="sm:flex-1">
            <Link href={trackHref}>{t("track")}</Link>
          </Button>
          <Button asChild variant="secondary" className="sm:flex-1">
            <Link href="/">{t("shop")}</Link>
          </Button>
        </div>
        <WhatsAppButton href={waHref} label={tc("wa.askOrder")} variant="link" className="self-center lg:self-start" />
      </div>

      <OrderSummary
        mode="panel"
        items={order.items}
        subtotalIdr={order.subtotalIdr}
        shippingIdr={order.shippingIdr}
        insuranceIdr={order.insuranceIdr}
        discountIdr={order.discountIdr}
        totalIdr={order.totalIdr}
      />
    </div>
  );
}
