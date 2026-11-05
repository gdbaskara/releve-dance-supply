import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import type { Locale } from "@/lib/contracts";
import { listBackInStock } from "@/lib/services/stock";
import { formatDateTimeWIB, formatPhoneID } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Panel, PageHeader } from "@/components/admin/panel";
import { DataTable } from "@/components/admin/data-table";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin.backInStock");
  return { title: t("title") };
}

export default async function BackInStockPage() {
  const [rows, t, locale] = await Promise.all([listBackInStock(), getTranslations("admin.backInStock"), getLocale() as Promise<Locale>]);
  const pending = rows.filter((r) => !r.notifiedAt).length;
  return (
    <>
      <PageHeader
        title={t("title")}
        description={t("description", { count: pending })}
      />
      <Panel flush>
        <DataTable
          rows={rows}
          rowKey={(r) => r.id}
          rowHref={(r) => `/admin/products/${r.productId}`}
          rowLinkLabel={(r) => t("openRow", { product: r.productName, variant: r.variantLabel })}
          caption={t("caption")}
          empty={t("empty")}
          rowProps={(r) => ({ "data-sku": r.sku })}
          columns={[
            {
              key: "variant",
              header: t("colVariant"),
              cell: (r) => (
                <span className="flex flex-col">
                  <span>
                    {r.productName} <span className="font-mono font-normal text-ink-muted">{r.modelCode}</span>
                  </span>
                  <span className="text-xs font-normal text-ink-muted">{r.variantLabel}</span>
                </span>
              ),
            },
            { key: "wa", header: t("colWhatsapp"), cell: (r) => <span className="tabular">{formatPhoneID(r.customerWa)}</span> },
            { key: "locale", header: t("colLanguage"), cell: (r) => r.locale.toUpperCase(), hideOnMobile: true },
            {
              key: "available",
              header: t("colStockNow"),
              align: "right",
              cell: (r) => (r.available > 0 ? <Badge variant="success">{t("left", { count: r.available })}</Badge> : <Badge variant="neutral">{t("soldOut")}</Badge>),
            },
            { key: "created", header: t("colRequested"), cell: (r) => <span className="text-ink-muted">{formatDateTimeWIB(r.createdAt, locale)}</span> },
            {
              key: "notified",
              header: t("colStatus"),
              cell: (r) =>
                r.notifiedAt ? (
                  <span className="flex flex-col items-start gap-0.5">
                    <Badge variant="success">{t("notified")}</Badge>
                    <span className="text-xs text-ink-muted">{formatDateTimeWIB(r.notifiedAt, locale)}</span>
                  </span>
                ) : (
                  <Badge variant="warning">{t("waiting")}</Badge>
                ),
            },
          ]}
        />
      </Panel>
    </>
  );
}
