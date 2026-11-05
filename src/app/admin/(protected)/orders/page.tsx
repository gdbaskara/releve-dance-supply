import type { Metadata } from "next";
import { Search } from "lucide-react";
import type { OrderStatus } from "@/lib/contracts";
import { listOrders } from "@/lib/services/order-admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Panel, PageHeader } from "@/components/admin/panel";
import { ChipLink, ChipRow } from "@/components/admin/chip-link";
import { OrderTable } from "@/components/admin/order-table";
import { Pagination } from "@/components/admin/pagination";
import { ORDER_STATUS_LABEL, ORDER_STATUS_ORDER } from "@/components/admin/labels";

export const metadata: Metadata = { title: "Order" };

const PAGE_SIZE = 25;

export default async function AdminOrdersPage({ searchParams }: PageProps<"/admin/orders">) {
  const sp = await searchParams;
  const rawStatus = typeof sp.status === "string" ? sp.status : "";
  const status = (ORDER_STATUS_ORDER as string[]).includes(rawStatus) ? (rawStatus as OrderStatus) : undefined;
  const q = typeof sp.q === "string" ? sp.q.slice(0, 60) : "";
  const page = Math.max(1, Number(typeof sp.page === "string" ? sp.page : 1) || 1);

  const [result, ...counts] = await Promise.all([
    listOrders({ status, q: q || undefined, page, pageSize: PAGE_SIZE }),
    listOrders({ q: q || undefined, pageSize: 1 }),
    ...ORDER_STATUS_ORDER.map((s) => listOrders({ status: s, q: q || undefined, pageSize: 1 })),
  ]);
  const [all, ...perStatus] = counts.map((c) => c.total);

  const href = (params: { status?: string; q?: string; page?: number }) => {
    const u = new URLSearchParams();
    if (params.status) u.set("status", params.status);
    if (params.q) u.set("q", params.q);
    if (params.page && params.page > 1) u.set("page", String(params.page));
    const s = u.toString();
    return s ? `/admin/orders?${s}` : "/admin/orders";
  };

  return (
    <>
      <PageHeader title="Order" description="Filter status, cari nomor order / nama / nomor WA." />
      <Panel flush>
        <div className="flex flex-col gap-3 border-b border-border p-4">
          <form method="get" action="/admin/orders" className="flex items-end gap-2" role="search">
            {status ? <input type="hidden" name="status" value={status} /> : null}
            <Input
              label="Cari order"
              name="q"
              type="search"
              defaultValue={q}
              placeholder="RDS-…, nama, atau 0812…"
              className="h-10"
              wrapperClassName="flex-1 md:max-w-md"
            />
            <Button type="submit" size="sm" variant="secondary" className="h-10" leadingIcon={<Search size={16} strokeWidth={1.5} aria-hidden />}>
              Cari
            </Button>
          </form>
          <ChipRow label="Filter status">
            <ChipLink href={href({ q })} selected={!status} count={all}>
              Semua
            </ChipLink>
            {ORDER_STATUS_ORDER.map((s, i) => (
              <ChipLink key={s} href={href({ status: s, q })} selected={status === s} count={perStatus[i]}>
                {ORDER_STATUS_LABEL[s]}
              </ChipLink>
            ))}
          </ChipRow>
        </div>
        <OrderTable rows={result.items} empty={q || status ? "Tidak ada order yang cocok dengan filter." : "Belum ada order."} />
        <Pagination page={result.page} pageSize={result.pageSize} total={result.total} hrefFor={(p) => href({ status, q, page: p })} />
      </Panel>
    </>
  );
}
