import { useLocale, useTranslations } from "next-intl";
import type { Locale } from "@/lib/contracts";
import type { OrderAdminRow } from "@/lib/services/order-admin";
import { formatDateTimeWIB, formatIDR, formatPhoneID } from "@/lib/format";
import { paymentMethodLabel } from "@/lib/services/labels";
import { Badge } from "@/components/ui/badge";
import { DataTable, type Column } from "./data-table";
import { OrderStatusBadge } from "./status-badge";

type Translate = ReturnType<typeof useTranslations<"admin.orders">>;

function orderColumns(t: Translate, locale: Locale): Column<OrderAdminRow>[] {
  return [
    { key: "orderNo", header: t("colOrderNo"), cell: (o) => <span className="whitespace-nowrap font-mono text-sm tracking-[0.04em]">{o.orderNo}</span> },
    {
      key: "customer",
      header: t("colCustomer"),
      cell: (o) => (
        <span className="flex flex-col">
          <span>{o.customerName}</span>
          <span className="whitespace-nowrap text-xs text-ink-muted">{formatPhoneID(o.customerWa)}</span>
        </span>
      ),
    },
    {
      key: "status",
      header: t("colStatus"),
      cell: (o) => (
        <span className="flex flex-wrap items-center gap-1">
          <OrderStatusBadge status={o.status} />
          {o.hasPreorder ? <Badge variant="warning">{t("preorderShort")}</Badge> : null}
        </span>
      ),
    },
    { key: "items", header: t("colItems"), align: "right", cell: (o) => <span className="tabular">{o.itemCount}</span>, hideOnMobile: true, className: "hidden xl:table-cell" },
    {
      key: "payment",
      header: t("colPayment"),
      cell: (o) => (o.paymentMethod ? paymentMethodLabel(o.paymentMethod, o.paymentChannel, locale) : "—"),
      hideOnMobile: true,
    },
    { key: "ship", header: t("colCourier"), cell: (o) => `${o.courier} ${o.service}`, hideOnMobile: true },
    { key: "total", header: t("colTotal"), align: "right", cell: (o) => <span className="tabular whitespace-nowrap font-semibold">{formatIDR(o.totalIdr)}</span> },
    { key: "createdAt", header: t("colCreated"), cell: (o) => <span className="text-ink-muted">{formatDateTimeWIB(o.createdAt, locale)}</span> },
  ];
}

export function OrderTable({ rows, empty }: { rows: OrderAdminRow[]; empty?: string }) {
  const t = useTranslations("admin.orders");
  const locale = useLocale() as Locale;
  return (
    <DataTable
      rows={rows}
      columns={orderColumns(t, locale)}
      rowKey={(o) => o.orderNo}
      rowHref={(o) => `/admin/orders/${o.orderNo}`}
      rowLinkLabel={(o) => t("openRow", { orderNo: o.orderNo })}
      caption={t("caption")}
      empty={empty ?? t("empty")}
      rowProps={(o) => ({ "data-order": o.orderNo, "data-status": o.status })}
    />
  );
}
