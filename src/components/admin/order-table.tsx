import type { OrderAdminRow } from "@/lib/services/order-admin";
import { formatDateTimeWIB, formatIDR, formatPhoneID } from "@/lib/format";
import { paymentMethodLabel } from "@/lib/services/labels";
import { Badge } from "@/components/ui/badge";
import { DataTable, type Column } from "./data-table";
import { OrderStatusBadge } from "./status-badge";

const columns: Column<OrderAdminRow>[] = [
  { key: "orderNo", header: "No. order", cell: (o) => <span className="font-mono text-sm tracking-[0.04em]">{o.orderNo}</span> },
  {
    key: "customer",
    header: "Pembeli",
    cell: (o) => (
      <span className="flex flex-col">
        <span>{o.customerName}</span>
        <span className="text-xs text-ink-muted">{formatPhoneID(o.customerWa)}</span>
      </span>
    ),
  },
  {
    key: "status",
    header: "Status",
    cell: (o) => (
      <span className="flex flex-wrap items-center gap-1">
        <OrderStatusBadge status={o.status} />
        {o.hasPreorder ? <Badge variant="warning">PO</Badge> : null}
      </span>
    ),
  },
  { key: "items", header: "Item", align: "right", cell: (o) => <span className="tabular">{o.itemCount}</span>, hideOnMobile: true },
  {
    key: "payment",
    header: "Bayar",
    cell: (o) => (o.paymentMethod ? paymentMethodLabel(o.paymentMethod, o.paymentChannel, "id") : "—"),
    hideOnMobile: true,
  },
  { key: "ship", header: "Kurir", cell: (o) => `${o.courier} ${o.service}`, hideOnMobile: true },
  { key: "total", header: "Total", align: "right", cell: (o) => <span className="tabular font-semibold">{formatIDR(o.totalIdr)}</span> },
  { key: "createdAt", header: "Dibuat", cell: (o) => <span className="whitespace-nowrap text-ink-muted">{formatDateTimeWIB(o.createdAt)}</span> },
];

export function OrderTable({ rows, empty }: { rows: OrderAdminRow[]; empty?: string }) {
  return (
    <DataTable
      rows={rows}
      columns={columns}
      rowKey={(o) => o.orderNo}
      rowHref={(o) => `/admin/orders/${o.orderNo}`}
      rowLinkLabel={(o) => `Buka order ${o.orderNo}`}
      caption="Daftar order"
      empty={empty ?? "Belum ada order."}
      rowProps={(o) => ({ "data-order": o.orderNo, "data-status": o.status })}
    />
  );
}
