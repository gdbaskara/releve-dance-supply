import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { BellRing, Clock, PackageCheck, TriangleAlert, Truck } from "lucide-react";
import { getDashboardStats, listOrders } from "@/lib/services/order-admin";
import { formatIDR } from "@/lib/format";
import { StatCard } from "@/components/admin/stat-card";
import { Panel, PageHeader } from "@/components/admin/panel";
import { OrderTable } from "@/components/admin/order-table";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin.dashboard");
  return { title: t("title") };
}

export default async function AdminDashboard() {
  const [stats, paid, processing, latest] = await Promise.all([
    getDashboardStats(),
    listOrders({ status: "PAID", pageSize: 1 }),
    listOrders({ status: "PROCESSING", pageSize: 1 }),
    listOrders({ pageSize: 10 }),
  ]);
  const t = await getTranslations("admin.dashboard");
  const icon = { size: 18, strokeWidth: 1.5, "aria-hidden": true } as const;
  return (
    <>
      <PageHeader
        title={t("title")}
        description={t("today", { orders: stats.ordersToday, revenue: formatIDR(stats.revenueTodayIdr) })}
      />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4" data-testid="stats">
        <StatCard
          label={t("pendingLabel")}
          value={stats.pendingPayment}
          hint={t("pendingHint")}
          href="/admin/orders?status=PENDING_PAYMENT"
          tone={stats.pendingPayment ? "warning" : "default"}
          icon={<Clock {...icon} />}
        />
        <StatCard
          label={t("toProcessLabel")}
          value={paid.total}
          hint={t("toProcessHint")}
          href="/admin/orders?status=PAID"
          tone={paid.total ? "info" : "default"}
          icon={<PackageCheck {...icon} />}
        />
        <StatCard
          label={t("toShipLabel")}
          value={processing.total}
          hint={t("toShipHint")}
          href="/admin/orders?status=PROCESSING"
          tone={processing.total ? "info" : "default"}
          icon={<Truck {...icon} />}
        />
        <StatCard
          label={t("lowStockLabel")}
          value={stats.lowStockVariants}
          hint={t("lowStockHint", { count: stats.soldOutVariants })}
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
            {t.rich("backInStock", {
              count: stats.pendingBackInStock,
              strong: (chunks) => <strong className="font-semibold">{chunks}</strong>,
            })}
          </span>
          <span className="ml-auto font-semibold underline underline-offset-4">{t("view")}</span>
        </Link>
      ) : null}

      <Panel
        className="mt-5"
        title={t("latest")}
        flush
        actions={
          <Link href="/admin/orders" className="text-sm font-semibold underline underline-offset-4">
            {t("allOrders")}
          </Link>
        }
      >
        <OrderTable rows={latest.items} />
      </Panel>
    </>
  );
}
