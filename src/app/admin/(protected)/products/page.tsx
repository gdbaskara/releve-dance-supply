import type { Metadata } from "next";
import { listProductsAdmin } from "@/lib/services/stock";
import { Panel, PageHeader } from "@/components/admin/panel";
import { ProductsTable } from "@/components/admin/products-table";

export const metadata: Metadata = { title: "Produk & stok" };

export default async function AdminProductsPage() {
  const rows = await listProductsAdmin();
  return (
    <>
      <PageHeader title="Produk & stok" description={`${rows.length} produk · klik produk untuk mengubah stok per varian.`} />
      <Panel flush>
        <ProductsTable rows={rows} disciplines={[...new Set(rows.map((r) => r.discipline))]} />
      </Panel>
    </>
  );
}
