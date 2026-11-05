import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Check, ChevronLeft, Circle } from "lucide-react";
import { getOrderAdmin } from "@/lib/services/order-admin";
import { formatDateTimeWIB, formatIDR, formatPhoneID } from "@/lib/format";
import { paymentMethodLabel } from "@/lib/services/labels";
import { buildWaLinkTo } from "@/lib/wa";
import type { MessageTemplate } from "@/lib/contracts";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { WhatsAppIcon } from "@/components/store/whatsapp-button";
import { cn } from "@/lib/utils/cn";
import { Meta, Panel, PageHeader } from "@/components/admin/panel";
import { OrderStatusBadge, TemplateBadge } from "@/components/admin/status-badge";
import { StatusSelect } from "@/components/admin/status-select";
import { ORDER_STATUS_LABEL } from "@/components/admin/labels";

export async function generateMetadata({ params }: PageProps<"/admin/orders/[orderNo]">): Promise<Metadata> {
  const { orderNo } = await params;
  return { title: `Order ${decodeURIComponent(orderNo)}` };
}

const PAYMENT_STATUS: Record<string, { label: string; tone: "success" | "warning" | "neutral" | "error" }> = {
  PENDING: { label: "Menunggu", tone: "warning" },
  PAID: { label: "Dibayar", tone: "success" },
  EXPIRED: { label: "Kedaluwarsa", tone: "neutral" },
  FAILED: { label: "Gagal", tone: "error" },
  CANCELLED: { label: "Dibatalkan", tone: "neutral" },
};

export default async function AdminOrderDetail({ params }: PageProps<"/admin/orders/[orderNo]">) {
  const { orderNo } = await params;
  const order = await getOrderAdmin(decodeURIComponent(orderNo));
  if (!order) notFound();

  const waText = `Halo ${order.customerName}, kami dari Relevé Dance Supply terkait pesanan ${order.orderNo}.`;
  const chatHref = buildWaLinkTo(order.customerWa, waText);
  const a = order.address;

  return (
    <>
      <PageHeader
        back={
          <Link href="/admin/orders" className="mb-1 inline-flex items-center gap-1 text-sm text-ink-muted hover:text-ink">
            <ChevronLeft size={16} strokeWidth={1.5} aria-hidden /> Order
          </Link>
        }
        title={<span className="font-mono tracking-[0.02em]">{order.orderNo}</span>}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <OrderStatusBadge status={order.status} />
            {order.hasPreorder ? <Badge variant="warning">Ada pre-order</Badge> : null}
            {order.fromCheckoutLink ? <Badge variant="outline">Dari checkout link</Badge> : null}
            <span>Dibuat {formatDateTimeWIB(order.createdAt)}</span>
          </span>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <div className="flex min-w-0 flex-col gap-4 lg:order-1">
          <Panel title={`Item (${order.items.reduce((n, i) => n + i.qty, 0)})`} flush>
            <ul className="divide-y divide-border">
              {order.items.map((it) => (
                <li key={it.sku} className="flex items-start gap-3 px-4 py-3 text-sm">
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="font-semibold text-ink">{it.name}</span>
                    <span className="text-ink-muted">{it.variantLabel}</span>
                    <span className="font-mono text-xs text-ink-muted">{it.sku}</span>
                    {it.isPreorder ? (
                      <span>
                        <Badge variant="warning">Pre-order</Badge>
                      </span>
                    ) : null}
                  </div>
                  <div className="tabular flex shrink-0 flex-col items-end gap-0.5">
                    <span className="text-ink-muted">
                      {it.qty} × {formatIDR(it.priceIdr)}
                    </span>
                    <span className="font-semibold text-ink">{formatIDR(it.qty * it.priceIdr)}</span>
                  </div>
                </li>
              ))}
            </ul>
            <dl className="tabular flex flex-col gap-1.5 border-t border-border bg-surface-alt px-4 py-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-ink-muted">Subtotal</dt>
                <dd>{formatIDR(order.subtotalIdr)}</dd>
              </div>
              {order.discountIdr ? (
                <div className="flex justify-between">
                  <dt className="text-ink-muted">Diskon{order.voucherCode ? ` (${order.voucherCode})` : ""}</dt>
                  <dd>−{formatIDR(order.discountIdr)}</dd>
                </div>
              ) : null}
              <div className="flex justify-between">
                <dt className="text-ink-muted">
                  Ongkir {order.shipping.courier} {order.shipping.service}
                </dt>
                <dd>{formatIDR(order.shippingIdr)}</dd>
              </div>
              {order.insuranceIdr ? (
                <div className="flex justify-between">
                  <dt className="text-ink-muted">Asuransi</dt>
                  <dd>{formatIDR(order.insuranceIdr)}</dd>
                </div>
              ) : null}
              <div className="mt-1 flex justify-between border-t border-border pt-2 text-base font-semibold">
                <dt>Total</dt>
                <dd>{formatIDR(order.totalIdr)}</dd>
              </div>
            </dl>
          </Panel>

          <Panel title="Pembayaran" flush>
            {order.payments.length === 0 ? (
              <p className="px-4 py-4 text-sm text-ink-muted">Belum ada pembayaran.</p>
            ) : (
              <ul className="divide-y divide-border text-sm">
                {order.payments.map((p) => {
                  const st = PAYMENT_STATUS[p.status] ?? { label: p.status, tone: "neutral" as const };
                  return (
                    <li key={p.providerRef} className="flex flex-col gap-1 px-4 py-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-semibold">{paymentMethodLabel(p.method, p.channel, "id")}</span>
                        <Badge variant={st.tone}>{st.label}</Badge>
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-ink-muted">
                        <span className="tabular">{formatIDR(p.amountIdr)}</span>
                        {p.vaNumber ? <span className="font-mono">VA {p.vaNumber}</span> : null}
                        <span className="font-mono">{p.provider} · {p.providerRef}</span>
                        <span>{p.paidAt ? `Dibayar ${formatDateTimeWIB(p.paidAt)}` : `Batas ${formatDateTimeWIB(p.expiresAt)}`}</span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>

          <Panel title="Riwayat">
            <ol className="flex flex-col gap-0" data-testid="timeline">
              {order.timeline.map((t, i) => (
                <li key={`${t.status}-${i}`} className="relative flex gap-3 pb-4 last:pb-0">
                  {i < order.timeline.length - 1 ? (
                    <span aria-hidden className={cn("absolute left-[9px] top-5 h-[calc(100%-12px)] w-px", t.done ? "bg-ink" : "bg-border")} />
                  ) : null}
                  <span
                    className={cn(
                      "relative z-10 mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-pill",
                      t.done ? "bg-ink text-ink-inverse" : "border border-border-strong bg-surface text-ink-subtle",
                    )}
                  >
                    {t.done ? <Check size={12} strokeWidth={2.5} aria-hidden /> : <Circle size={6} aria-hidden />}
                  </span>
                  <div className="flex flex-col text-sm">
                    <span className={cn("font-medium", t.done ? "text-ink" : "text-ink-muted")}>{ORDER_STATUS_LABEL[t.status]}</span>
                    {t.at ? <span className="text-xs text-ink-muted">{formatDateTimeWIB(t.at)}</span> : null}
                    {t.note ? <span className="font-mono text-xs text-ink">{t.note}</span> : null}
                  </div>
                </li>
              ))}
            </ol>
          </Panel>

          <Panel
            title={`Pesan WA (${order.messages.length})`}
            actions={
              <Link href={`/admin/outbox?orderNo=${order.orderNo}`} className="text-sm font-semibold underline underline-offset-4">
                Lihat di outbox
              </Link>
            }
          >
            {order.messages.length === 0 ? (
              <p className="text-sm text-ink-muted">{order.waOptIn ? "Belum ada pesan." : "Pembeli tidak memilih notifikasi WA."}</p>
            ) : (
              <ul className="flex flex-col gap-3" data-testid="order-messages">
                {order.messages.map((m, i) => (
                  <li key={i} className="flex flex-col gap-1 rounded-md bg-surface-alt px-3 py-2 text-sm">
                    <div className="flex flex-wrap items-center gap-2">
                      <TemplateBadge template={m.template as MessageTemplate} />
                      <span className="text-xs text-ink-muted">{formatDateTimeWIB(m.createdAt)}</span>
                    </div>
                    <p className="whitespace-pre-wrap break-words text-ink">{m.body}</p>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>

        <div className="order-first flex flex-col gap-4 lg:order-2">
          <Panel title="Status">
            <div className="mb-3 flex items-center gap-2 text-sm">
              <span className="text-ink-muted">Saat ini</span>
              <OrderStatusBadge status={order.status} />
            </div>
            <StatusSelect
              key={order.status}
              orderNo={order.orderNo}
              status={order.status}
              allowed={order.allowedTransitions}
              defaultCourier={order.shipping.courier}
            />
            {order.tracking ? (
              <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-border pt-3">
                <Meta label="Kurir">{order.tracking.courier}</Meta>
                <Meta label="Resi">
                  <span className="font-mono">{order.tracking.awb || "—"}</span>
                </Meta>
                {order.tracking.shippedAt ? <Meta label="Dikirim">{formatDateTimeWIB(order.tracking.shippedAt)}</Meta> : null}
                {order.tracking.deliveredAt ? <Meta label="Terkirim">{formatDateTimeWIB(order.tracking.deliveredAt)}</Meta> : null}
              </dl>
            ) : null}
          </Panel>

          <Panel title="Kontak">
            <dl className="flex flex-col gap-3">
              <Meta label="Nama">{order.customerName}</Meta>
              <Meta label="WhatsApp">
                <span className="tabular">{formatPhoneID(order.customerWa)}</span>
                {order.waOptIn ? null : <span className="ml-2 text-xs text-ink-muted">(tanpa notifikasi WA)</span>}
              </Meta>
              {order.customerEmail ? <Meta label="Email">{order.customerEmail}</Meta> : null}
            </dl>
            <a
              href={chatHref}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(buttonVariants({ variant: "whatsapp", size: "sm", fullWidth: true }), "mt-4")}
            >
              <WhatsAppIcon size={18} /> Chat pembeli
            </a>
          </Panel>

          <Panel title="Pengiriman">
            <dl className="flex flex-col gap-3">
              <Meta label="Layanan">
                {order.shipping.courier} {order.shipping.service} · estimasi {order.shipping.eta} {order.shipping.etaUnit === "hours" ? "jam" : "hari"}
              </Meta>
              <Meta label="Alamat">
                <span className="block">{a.line}</span>
                <span className="block">
                  {a.district}, {a.city}
                </span>
                <span className="block">
                  {a.province} {a.postalCode}
                </span>
                {a.note ? <span className="mt-1 block text-xs text-ink-muted">Catatan: {a.note}</span> : null}
              </Meta>
            </dl>
          </Panel>
        </div>
      </div>
    </>
  );
}
