import type { Metadata } from "next";
import Link from "next/link";
import { listCheckoutLinks } from "@/lib/services/checkout-link";
import { listProductsAdmin } from "@/lib/services/stock";
import { formatDateTimeWIB, formatPhoneID } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { CopyButton } from "@/components/ui/copy-button";
import { Panel, PageHeader } from "@/components/admin/panel";
import { DataTable } from "@/components/admin/data-table";
import { CheckoutLinkBuilder } from "@/components/admin/checkout-link-builder";
import { LINK_STATUS_LABEL, LINK_STATUS_TONE } from "@/components/admin/labels";

export const metadata: Metadata = { title: "Checkout link" };

export default async function CheckoutLinksPage() {
  const [products, links] = await Promise.all([listProductsAdmin(), listCheckoutLinks(50)]);
  const builderProducts = products
    .filter((p) => p.isActive)
    .map((p) => ({ id: p.id, name: p.name, modelCode: p.modelCode, discipline: p.discipline, audience: p.audience, priceIdr: p.priceIdr }));

  return (
    <>
      <PageHeader
        title="Checkout link"
        description="Buat keranjang siap bayar untuk pembeli yang konsultasi via WhatsApp (berlaku 48 jam)."
      />
      <CheckoutLinkBuilder products={builderProducts} />

      <Panel className="mt-6" title={`Link terbaru (${links.length})`} flush>
        <DataTable
          rows={links}
          rowKey={(l) => l.token}
          caption="Checkout link"
          empty="Belum ada checkout link."
          rowProps={(l) => ({ "data-token": l.token, "data-status": l.status })}
          columns={[
            {
              key: "customer",
              header: "Pembeli",
              cell: (l) => (
                <span className="flex flex-col">
                  <span className="font-semibold">{l.customerName ?? "Tanpa nama"}</span>
                  <span className="text-xs text-ink-muted">{l.customerWa ? formatPhoneID(l.customerWa) : "—"}</span>
                </span>
              ),
            },
            {
              key: "items",
              header: "Item",
              cell: (l) => (
                <span className="flex flex-col">
                  <span>
                    {l.items.reduce((n, i) => n + i.qty, 0)} pcs · {l.items.length} varian
                  </span>
                  <span className="max-w-56 truncate font-mono text-xs text-ink-muted" title={l.items.map((i) => `${i.sku} ×${i.qty}`).join(", ")}>
                    {l.items.map((i) => i.sku).join(", ")}
                  </span>
                </span>
              ),
            },
            { key: "created", header: "Dibuat", cell: (l) => <span className="text-ink-muted">{formatDateTimeWIB(l.createdAt)}</span>, hideOnMobile: true },
            { key: "expires", header: "Berlaku s/d", cell: (l) => <span className="text-ink-muted">{formatDateTimeWIB(l.expiresAt)}</span> },
            {
              key: "status",
              header: "Status",
              cell: (l) => (
                <span className="flex flex-col items-start gap-1">
                  <Badge variant={LINK_STATUS_TONE[l.status]}>{LINK_STATUS_LABEL[l.status]}</Badge>
                  {l.usedOrderNo ? (
                    <Link href={`/admin/orders/${l.usedOrderNo}`} className="font-mono text-xs underline underline-offset-4">
                      {l.usedOrderNo}
                    </Link>
                  ) : null}
                </span>
              ),
            },
            {
              key: "copy",
              header: "Link",
              cell: (l) =>
                l.status === "ACTIVE" ? <CopyButton value={l.url} ariaLabel="Salin checkout link" className="-ml-2" /> : <span className="text-ink-muted">—</span>,
            },
          ]}
        />
      </Panel>
    </>
  );
}
