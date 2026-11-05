import type { Metadata } from "next";
import Link from "next/link";
import { BellRing, Clock, PackageCheck, TriangleAlert, Truck } from "lucide-react";
import { getDashboardStats, listOrders } from "@/lib/services/order-admin";
import { formatIDR } from "@/lib/format";
import { StatCard } from "@/components/admin/stat-card";
import { Panel, PageHeader } from "@/components/admin/panel";
import { OrderTable } from "@/components/admin/order-table";

export const metadata: Metadata = { title: "Dashboard" };

export default async function AdminDashboard() {
  const [stats, paid, processing, latest] = await Promise.all([
    getDashboardStats(),
    listOrders({ status: "PAID", pageSize: 1 }),
    listOrders({ status: "PROCESSING", pageSize: 1 }),
    listOrders({ pageSize: 10 }),
  ]);
  const icon = { size: 18, strokeWidth: 1.5, "aria-hidden": true } as const;
  return (
    <>
      <PageHeader
        title="Dashboard"
        description={`Hari ini: ${stats.ordersToday} order · omzet ${formatIDR(stats.revenueTodayIdr)}`}
      />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4" data-testid="stats">
        <StatCard
          label="Menunggu bayar"
          value={stats.pendingPayment}
          hint="Order belum dibayar"
          href="/admin/orders?status=PENDING_PAYMENT"
          tone={stats.pendingPayment ? "warning" : "default"}
          icon={<Clock {...icon} />}
        />
        <StatCard
          label="Perlu diproses"
          value={paid.total}
          hint="Sudah dibayar"
          href="/admin/orders?status=PAID"
          tone={paid.total ? "info" : "default"}
          icon={<PackageCheck {...icon} />}
        />
        <StatCard
          label="Perlu dikirim"
          value={processing.total}
          hint="Sedang diproses"
          href="/admin/orders?status=PROCESSING"
          tone={processing.total ? "info" : "default"}
          icon={<Truck {...icon} />}
        />
        <StatCard
          label="Stok rendah"
          value={stats.lowStockVariants}
          hint={`${stats.soldOutVariants} varian habis`}
          href="/admin/low-stock"
          tone={stats.lowStockVariants ? "warning" : "default"}
          icon={<TriangleAlert {...icon} />}
        />
      </div>

      {stats.pendingBackInStock ? (
        <Link
          href="/admin/back-in-stock"
          className="mt-3 flex items-center gap-3 rounded-lg border border-border bg-surface px-4 py-3 text-sm hover:border-border-strong"
        >
          <BellRing size={18} strokeWidth={1.5} aria-hidden className="text-accent-strong" />
          <span>
            <strong className="font-semibold">{stats.pendingBackInStock}</strong> permintaan back-in-stock menunggu stok.
          </span>
          <span className="ml-auto font-semibold underline underline-offset-4">Lihat</span>
        </Link>
      ) : null}

      <Panel
        className="mt-5"
        title="10 order terbaru"
        flush
        actions={
          <Link href="/admin/orders" className="text-sm font-semibold underline underline-offset-4">
            Semua order
          </Link>
        }
      >
        <OrderTable rows={latest.items} />
      </Panel>
    </>
  );
}
