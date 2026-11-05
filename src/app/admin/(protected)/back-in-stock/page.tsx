import type { Metadata } from "next";
import { listBackInStock } from "@/lib/services/stock";
import { formatDateTimeWIB, formatPhoneID } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Panel, PageHeader } from "@/components/admin/panel";
import { DataTable } from "@/components/admin/data-table";

export const metadata: Metadata = { title: "Back-in-stock" };

export default async function BackInStockPage() {
  const rows = await listBackInStock();
  const pending = rows.filter((r) => !r.notifiedAt).length;
  return (
    <>
      <PageHeader
        title="Back-in-stock"
        description={`${pending} menunggu · pembeli otomatis dikabari via WA saat stok varian ditambah dari 0.`}
      />
      <Panel flush>
        <DataTable
          rows={rows}
          rowKey={(r) => r.id}
          rowHref={(r) => `/admin/products/${r.productId}`}
          rowLinkLabel={(r) => `Kelola stok ${r.productName} ${r.variantLabel}`}
          caption="Permintaan back-in-stock"
          empty="Belum ada permintaan."
          rowProps={(r) => ({ "data-sku": r.sku })}
          columns={[
            {
              key: "variant",
              header: "Varian",
              cell: (r) => (
                <span className="flex flex-col">
                  <span>
                    {r.productName} <span className="font-mono font-normal text-ink-muted">{r.modelCode}</span>
                  </span>
                  <span className="text-xs font-normal text-ink-muted">{r.variantLabel}</span>
                </span>
              ),
            },
            { key: "wa", header: "WhatsApp", cell: (r) => <span className="tabular">{formatPhoneID(r.customerWa)}</span> },
            { key: "locale", header: "Bahasa", cell: (r) => r.locale.toUpperCase(), hideOnMobile: true },
            {
              key: "available",
              header: "Stok kini",
              align: "right",
              cell: (r) => (r.available > 0 ? <Badge variant="success">Sisa {r.available}</Badge> : <Badge variant="neutral">Habis</Badge>),
            },
            { key: "created", header: "Diminta", cell: (r) => <span className="text-ink-muted">{formatDateTimeWIB(r.createdAt)}</span> },
            {
              key: "notified",
              header: "Status",
              cell: (r) =>
                r.notifiedAt ? (
                  <span className="flex flex-col items-start gap-0.5">
                    <Badge variant="success">Dikabari</Badge>
                    <span className="text-xs text-ink-muted">{formatDateTimeWIB(r.notifiedAt)}</span>
                  </span>
                ) : (
                  <Badge variant="warning">Menunggu</Badge>
                ),
            },
          ]}
        />
      </Panel>
    </>
  );
}
