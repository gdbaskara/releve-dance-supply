import type { Metadata } from "next";
import { listLowStock } from "@/lib/services/stock";
import { LOW_STOCK_THRESHOLD } from "@/lib/contracts";
import { Badge } from "@/components/ui/badge";
import { Panel, PageHeader } from "@/components/admin/panel";
import { DataTable } from "@/components/admin/data-table";

export const metadata: Metadata = { title: "Stok rendah" };

export default async function LowStockPage() {
  const rows = await listLowStock({ limit: 200 });
  return (
    <>
      <PageHeader title="Stok rendah" description={`Varian dengan sisa 1–${LOW_STOCK_THRESHOLD} unit, paling sedikit di atas.`} />
      <Panel flush>
        <DataTable
          rows={rows}
          rowKey={(r) => r.sku}
          rowHref={(r) => `/admin/products/${r.productId}`}
          rowLinkLabel={(r) => `Kelola stok ${r.productName} ${r.label}`}
          caption="Varian stok rendah"
          empty="Tidak ada varian dengan stok rendah."
          columns={[
            {
              key: "product",
              header: "Produk",
              cell: (r) => (
                <span className="flex flex-col">
                  <span>{r.productName}</span>
                  <span className="font-mono text-xs font-normal text-ink-muted">{r.modelCode}</span>
                </span>
              ),
            },
            { key: "variant", header: "Varian", cell: (r) => r.label },
            { key: "sku", header: "SKU", cell: (r) => <span className="font-mono text-xs">{r.sku}</span>, hideOnMobile: true },
            { key: "onHand", header: "On hand", align: "right", cell: (r) => <span className="tabular">{r.onHand}</span> },
            { key: "reserved", header: "Dipesan", align: "right", cell: (r) => <span className="tabular">{r.reserved}</span> },
            { key: "available", header: "Sisa", align: "right", cell: (r) => <Badge variant="warning">Sisa {r.available}</Badge> },
          ]}
        />
      </Panel>
    </>
  );
}
