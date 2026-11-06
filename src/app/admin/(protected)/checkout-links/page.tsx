import type { Metadata } from "next";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import type { Locale } from "@/lib/contracts";
import { listCheckoutLinks } from "@/lib/services/checkout-link";
import { listProductsAdmin } from "@/lib/services/stock";
import { formatDateTimeWIB, formatPhoneID } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { CopyButton } from "@/components/ui/copy-button";
import { Panel, PageHeader } from "@/components/admin/panel";
import { DataTable } from "@/components/admin/data-table";
import { CheckoutLinkBuilder } from "@/components/admin/checkout-link-builder";
import { LINK_STATUS_TONE } from "@/components/admin/labels";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin.checkoutLinks");
  return { title: t("title") };
}

export default async function CheckoutLinksPage() {
  const [products, links, t, tStatus, locale] = await Promise.all([
    listProductsAdmin(),
    listCheckoutLinks(50),
    getTranslations("admin.checkoutLinks"),
    getTranslations("admin.linkStatus"),
    getLocale() as Promise<Locale>,
  ]);
  const builderProducts = products
    .filter((p) => p.isActive)
    .map((p) => ({ id: p.id, name: p.name, modelCode: p.modelCode, discipline: p.discipline, audience: p.audience, priceIdr: p.priceIdr }));

  return (
    <>
      <PageHeader
        title={t("title")}
        description={t("description")}
      />
      <CheckoutLinkBuilder products={builderProducts} />

      <Panel className="mt-6" title={t("recent", { count: links.length })} flush>
        <DataTable
          rows={links}
          rowKey={(l) => l.token}
          caption={t("caption")}
          empty={t("empty")}
          rowProps={(l) => ({ "data-token": l.token, "data-status": l.status })}
          columns={[
            {
              key: "customer",
              header: t("colCustomer"),
              cell: (l) => (
                <span className="flex flex-col">
                  <span className="font-semibold">{l.customerName ?? t("noName")}</span>
                  <span className="text-xs text-ink-muted">{l.customerWa ? formatPhoneID(l.customerWa) : "-"}</span>
                </span>
              ),
            },
            {
              key: "items",
              header: t("colItems"),
              cell: (l) => (
                <span className="flex flex-col">
                  <span>{t("itemsSummary", { pcs: l.items.reduce((n, i) => n + i.qty, 0), variants: l.items.length })}</span>
                  <span className="max-w-56 truncate font-mono text-xs text-ink-muted" title={l.items.map((i) => `${i.sku} ×${i.qty}`).join(", ")}>
                    {l.items.map((i) => i.sku).join(", ")}
                  </span>
                </span>
              ),
            },
            { key: "created", header: t("colCreated"), cell: (l) => <span className="text-ink-muted">{formatDateTimeWIB(l.createdAt, locale)}</span>, hideOnMobile: true },
            { key: "expires", header: t("colExpires"), cell: (l) => <span className="text-ink-muted">{formatDateTimeWIB(l.expiresAt, locale)}</span> },
            {
              key: "status",
              header: t("colStatus"),
              cell: (l) => (
                <span className="flex flex-col items-start gap-1">
                  <Badge variant={LINK_STATUS_TONE[l.status]}>{tStatus(l.status)}</Badge>
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
              header: t("colLink"),
              cell: (l) =>
                l.status === "ACTIVE" ? <CopyButton value={l.url} ariaLabel={t("copyLink")} className="-ml-2" /> : <span className="text-ink-muted">-</span>,
            },
          ]}
        />
      </Panel>
    </>
  );
}
