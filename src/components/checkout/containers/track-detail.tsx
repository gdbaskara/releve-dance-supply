import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { OrderPublicView, OrderStatus } from "@/lib/contracts";
import { formatDateTimeWIB, formatIDR } from "@/lib/format";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";
import { linkStyles } from "@/components/ui/link";
import { ProductImage } from "@/components/store/product-image";
import { WhatsAppButton } from "@/components/store/whatsapp-button";
import { OrderTimeline } from "../order-timeline";

const TONE: Record<OrderStatus, NonNullable<BadgeProps["variant"]>> = {
  PENDING_PAYMENT: "warning",
  PAID: "info",
  PROCESSING: "info",
  SHIPPED: "info",
  DELIVERED: "success",
  EXPIRED: "neutral",
  CANCELLED: "neutral",
  REFUND_PENDING: "warning",
};

/** ORD-03/04, SHP-04 — timeline, items, courier + AWB (Salin), WA "Tanya pesanan ini". */
export function TrackDetail({ order, waHref }: { order: OrderPublicView; waHref: string }) {
  const t = useTranslations("order");
  const tc = useTranslations("common");
  const locale = useLocale() === "en" ? "en" : "id";
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-3">
          <span className="tabular font-mono text-lg font-medium tracking-[0.04em]" data-testid="order-no">
            {order.orderNo}
          </span>
          <Badge variant={TONE[order.status]} data-testid="order-status">
            {t(`status.${order.status}`)}
          </Badge>
        </div>
        <p className="text-sm text-ink-muted">{t("track.placedOn", { date: formatDateTimeWIB(new Date(order.createdAt), locale) })}</p>
        {order.status === "PENDING_PAYMENT" ? (
          <Button asChild size="sm" className="mt-2 self-start">
            <Link href={`/pay/${order.orderNo}`}>{t("track.payNow")}</Link>
          </Button>
        ) : null}
      </div>

      <section className="flex flex-col gap-4">
        <h2 className="eyebrow">{tc("timeline.title")}</h2>
        <OrderTimeline entries={order.timeline} tracking={order.tracking} />
      </section>

      <section className="flex flex-col gap-3 rounded-md border border-border p-4">
        <h2 className="eyebrow">{t("track.courier")}</h2>
        <p className="text-sm">
          {order.shipping.courier} {order.shipping.service}
        </p>
        {order.tracking ? (
          <div className="flex items-center justify-between gap-3 border-t border-border pt-3">
            <div className="flex min-w-0 flex-col">
              <span className="text-xs text-ink-muted">{t("track.awb")}</span>
              <span className="tabular truncate font-mono text-base font-medium tracking-[0.04em]" data-testid="awb">
                {order.tracking.awb}
              </span>
            </div>
            <CopyButton value={order.tracking.awb} ariaLabel={t("track.copyAwb")} appearance="outline" />
          </div>
        ) : (
          <p className="text-xs text-ink-muted">{t("track.awbPending")}</p>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="eyebrow">{t("track.items")}</h2>
        <ul className="flex flex-col gap-3">
          {order.items.map((it, i) => (
            <li key={`${it.name}-${i}`} className="flex gap-3">
              <div className="w-14 shrink-0">
                <ProductImage src={it.imageUrl} alt={it.name} sizes="56px" />
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="text-sm font-medium">{it.name}</span>
                <span className="text-xs text-ink-muted">
                  {it.variantLabel} · ×{it.qty}
                </span>
                {it.isPreorder ? (
                  <Badge variant="warning" className="self-start">
                    {t("preorder")}
                  </Badge>
                ) : null}
              </div>
              <span className="tabular text-sm font-medium">{formatIDR(it.priceIdr * it.qty)}</span>
            </li>
          ))}
        </ul>
        <div className="flex items-baseline justify-between border-t border-border pt-3">
          <span className="eyebrow">{t("track.total")}</span>
          <span className="tabular text-lg font-semibold">{formatIDR(order.totalIdr)}</span>
        </div>
      </section>

      <div className="flex flex-col gap-3">
        <WhatsAppButton href={waHref} label={tc("wa.askOrder")} fullWidth />
        <Link href="/track" className={linkStyles({ className: "self-center text-sm" })}>
          {t("track.another")}
        </Link>
      </div>
    </div>
  );
}
