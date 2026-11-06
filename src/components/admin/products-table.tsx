"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import type { ProductAdminRow } from "@/lib/services/stock";
import { formatIDR } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { DataTable, type Column } from "./data-table";

type ProductTableRow = ProductAdminRow;

function norm(s: string) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

function StockSummary({ p }: { p: ProductTableRow }) {
  const t = useTranslations("admin.products");
  const c = p.statusCounts;
  const sellable = c.READY + c.LOW;
  if (sellable === 0 && c.PREORDER === 0) return <Badge variant="neutral">{t("soldOut")}</Badge>;
  return (
    <span className="flex flex-wrap gap-1">
      {sellable ? <Badge variant="success">{t("readyCount", { count: sellable })}</Badge> : null}
      {c.LOW ? <Badge variant="warning">{t("lowCount", { count: c.LOW })}</Badge> : null}
      {c.SOLD_OUT ? <Badge variant="neutral">{t("soldOutCount", { count: c.SOLD_OUT })}</Badge> : null}
    </span>
  );
}

type SortKey = "name" | "modelCode" | "discipline" | "priceIdr" | "onHand";

export function ProductsTable({ rows, disciplines }: { rows: ProductTableRow[]; disciplines: string[] }) {
  const t = useTranslations("admin.products");
  const [q, setQ] = React.useState("");
  const [discipline, setDiscipline] = React.useState("");
  const [sort, setSort] = React.useState<{ key: SortKey; dir: "asc" | "desc" } | null>(null);

  const filtered = React.useMemo(() => {
    const nq = norm(q.trim());
    let out = rows.filter(
      (p) => (!discipline || p.discipline === discipline) && (!nq || norm(`${p.name} ${p.modelCode} ${p.discipline}`).includes(nq)),
    );
    if (sort) {
      const k = sort.key;
      const m = sort.dir === "asc" ? 1 : -1;
      out = [...out].sort((a, b) => {
        const av = k === "onHand" ? a.onHand - a.reserved : a[k];
        const bv = k === "onHand" ? b.onHand - b.reserved : b[k];
        return (typeof av === "number" && typeof bv === "number" ? av - bv : String(av).localeCompare(String(bv))) * m;
      });
    }
    return out;
  }, [rows, q, discipline, sort]);

  const columns: Column<ProductTableRow>[] = [
    {
      key: "name",
      header: t("colName"),
      sortable: true,
      cell: (p) => (
        <span className="flex flex-col">
          <span>{p.name}</span>
          <span className="text-xs font-normal text-ink-muted">{t("variantsMeta", { audience: p.audience, count: p.variantCount })}</span>
        </span>
      ),
    },
    { key: "modelCode", header: t("colCode"), sortable: true, cell: (p) => <span className="font-mono text-sm">{p.modelCode}</span> },
    { key: "discipline", header: t("colDiscipline"), sortable: true, cell: (p) => p.discipline },
    { key: "priceIdr", header: t("colPrice"), align: "right", sortable: true, cell: (p) => <span className="tabular">{formatIDR(p.priceIdr)}</span> },
    {
      key: "onHand",
      header: t("colStock"),
      align: "right",
      sortable: true,
      cell: (p) => (
        <span className="tabular">
          {p.onHand}
          {p.reserved ? <span className="text-xs text-ink-muted"> {t("reserved", { count: p.reserved })}</span> : null}
        </span>
      ),
    },
    { key: "status", header: t("colStatus"), cell: (p) => <StockSummary p={p} /> },
    {
      key: "preorder",
      header: t("colPreorder"),
      // variants that are out of stock but sellable as pre-order right now
      cell: (p) =>
        p.statusCounts.PREORDER === 0 ? (
          <span className="text-ink-muted">-</span>
        ) : (
          <Badge variant="warning">{p.statusCounts.PREORDER === p.variantCount ? t("allVariants") : t("variantCount", { count: p.statusCounts.PREORDER })}</Badge>
        ),
    },
  ];

  return (
    <div className="flex flex-col">
      <div className="flex flex-col gap-3 border-b border-border p-4 md:flex-row md:items-end">
        <Input
          label={t("searchLabel")}
          placeholder={t("searchPlaceholder")}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="h-10"
          wrapperClassName="md:flex-1"
          type="search"
        />
        <Select
          label={t("disciplineLabel")}
          value={discipline}
          onChange={(e) => setDiscipline(e.target.value)}
          options={[{ value: "", label: t("allDisciplines") }, ...disciplines.map((d) => ({ value: d, label: d }))]}
          className="h-10"
          wrapperClassName="md:w-56"
        />
        <p className="text-sm text-ink-muted md:pb-2.5" aria-live="polite">
          {t("count", { count: filtered.length })}
        </p>
      </div>
      <DataTable
        rows={filtered}
        columns={columns}
        rowKey={(p) => p.id}
        rowHref={(p) => `/admin/products/${p.id}`}
        rowLinkLabel={(p) => t("openRow", { name: p.name, modelCode: p.modelCode })}
        caption={t("caption")}
        empty={t("empty")}
        sort={sort}
        onSort={(key) =>
          setSort((s) => (s?.key === key ? (s.dir === "asc" ? { key: key as SortKey, dir: "desc" } : null) : { key: key as SortKey, dir: "asc" }))
        }
      />
    </div>
  );
}
