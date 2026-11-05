import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { listProductsAdmin } from "@/lib/services/stock";
import { Panel, PageHeader } from "@/components/admin/panel";
import { ProductsTable } from "@/components/admin/products-table";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin.products");
  return { title: t("title") };
}

export default async function AdminProductsPage() {
  const [rows, t] = await Promise.all([listProductsAdmin(), getTranslations("admin.products")]);
  return (
    <>
      <PageHeader title={t("title")} description={t("description", { count: rows.length })} />
      <Panel flush>
        <ProductsTable rows={rows} disciplines={[...new Set(rows.map((r) => r.discipline))]} />
      </Panel>
    </>
  );
}
