import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { listLowStock } from "@/lib/services/stock";
import { LOW_STOCK_THRESHOLD } from "@/lib/contracts";
import { Badge } from "@/components/ui/badge";
import { Panel, PageHeader } from "@/components/admin/panel";
import { DataTable } from "@/components/admin/data-table";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin.lowStock");
  return { title: t("title") };
}

export default async function LowStockPage() {
  const [rows, t] = await Promise.all([listLowStock({ limit: 200 }), getTranslations("admin.lowStock")]);
  return (
    <>
      <PageHeader title={t("title")} description={t("description", { threshold: LOW_STOCK_THRESHOLD })} />
      <Panel flush>
        <DataTable
          rows={rows}
          rowKey={(r) => r.sku}
          rowHref={(r) => `/admin/products/${r.productId}`}
          rowLinkLabel={(r) => t("openRow", { product: r.productName, variant: r.label })}
          caption={t("caption")}
          empty={t("empty")}
          columns={[
            {
              key: "product",
              header: t("colProduct"),
              cell: (r) => (
                <span className="flex flex-col">
                  <span>{r.productName}</span>
                  <span className="font-mono text-xs font-normal text-ink-muted">{r.modelCode}</span>
                </span>
              ),
            },
            { key: "variant", header: t("colVariant"), cell: (r) => r.label },
            { key: "sku", header: t("colSku"), cell: (r) => <span className="font-mono text-xs">{r.sku}</span>, hideOnMobile: true },
            { key: "onHand", header: t("colOnHand"), align: "right", cell: (r) => <span className="tabular">{r.onHand}</span> },
            { key: "reserved", header: t("colReserved"), align: "right", cell: (r) => <span className="tabular">{r.reserved}</span> },
            { key: "available", header: t("colAvailable"), align: "right", cell: (r) => <Badge variant="warning">{t("left", { count: r.available })}</Badge> },
          ]}
        />
      </Panel>
    </>
  );
}
