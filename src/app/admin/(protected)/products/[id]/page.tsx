import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import type { Locale } from "@/lib/contracts";
import { adminNumberLocale } from "@/i18n/admin-locale";
import { getProductAdmin, listStockMovements } from "@/lib/services/stock";
import { formatDateTimeWIB, formatIDR } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Panel, PageHeader, Meta } from "@/components/admin/panel";
import { VariantStockGrid } from "@/components/admin/variant-stock-grid";
import { PreorderPanel } from "@/components/admin/preorder-panel";
import { SPOT_USD_IDR, STOCK_REASONS } from "@/components/admin/labels";

export async function generateMetadata({ params }: PageProps<"/admin/products/[id]">): Promise<Metadata> {
  const { id } = await params;
  const p = await getProductAdmin(decodeURIComponent(id));
  if (p) return { title: `${p.name} ${p.modelCode}` };
  const t = await getTranslations("admin.productDetail");
  return { title: t("metaFallback") };
}

export default async function AdminProductDetail({ params }: PageProps<"/admin/products/[id]">) {
  const { id } = await params;
  const product = await getProductAdmin(decodeURIComponent(id));
  if (!product) notFound();

  const skus = product.variants.map((v) => v.sku);
  const [movements, t, tReason, locale] = await Promise.all([
    listStockMovements({ skus, limit: 15 }),
    getTranslations("admin.productDetail"),
    getTranslations("admin.stockReason"),
    getLocale() as Promise<Locale>,
  ]);
  const reasonLabel = (reason: string) => (STOCK_REASONS.includes(reason) ? tReason(reason) : reason);
  const labelBySku = new Map(product.variants.map((v) => [v.sku, v.label]));

  const { priceIdr, landedCostIdr, msrpUsd } = product;
  const msrpIdr = msrpUsd * SPOT_USD_IDR;
  const marginIdr = priceIdr - landedCostIdr;
  const marginPct = priceIdr ? (marginIdr / priceIdr) * 100 : 0;
  const fmt1 = (n: number) => n.toLocaleString(adminNumberLocale(locale), { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const totals = product.variants.reduce(
    (a, v) => ({ onHand: a.onHand + v.onHand, reserved: a.reserved + v.reserved, po: a.po + (v.preorderEnabled ? 1 : 0) }),
    { onHand: 0, reserved: 0, po: 0 },
  );
  const lead = product.variants.find((v) => v.preorderEnabled && v.preorderLeadWeeks)?.preorderLeadWeeks ?? null;

  return (
    <>
      <PageHeader
        back={
          <Link href="/admin/products" className="mb-1 inline-flex items-center gap-1 text-sm text-ink-muted hover:text-ink">
            <ChevronLeft size={16} strokeWidth={1.5} aria-hidden /> {t("back")}
          </Link>
        }
        title={product.name}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <span className="font-mono">{product.modelCode}</span>
            <span aria-hidden>·</span>
            <span>{product.discipline}</span>
            <span aria-hidden>·</span>
            <span>{product.audience}</span>
            <span aria-hidden>·</span>
            <span>
              {totals.reserved
                ? t("summaryReserved", { variants: product.variants.length, onHand: totals.onHand, reserved: totals.reserved })
                : t("summary", { variants: product.variants.length, onHand: totals.onHand })}
            </span>
          </span>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="flex min-w-0 flex-col gap-4">
          <Panel title={t("stockPanel")}>
            <VariantStockGrid variants={product.variants} widthOrder={product.widths} />
          </Panel>

          <Panel title={t("movements")} flush>
            {movements.length === 0 ? (
              <p className="px-4 py-6 text-sm text-ink-muted">{t("noMovements")}</p>
            ) : (
              <ul className="divide-y divide-border text-sm" data-testid="movements">
                {movements.map((m) => (
                  <li key={m.id} className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-0.5 px-4 py-2.5 md:grid-cols-[160px_1fr_auto_auto]">
                    <span className="text-xs text-ink-muted md:text-sm">{formatDateTimeWIB(m.createdAt, locale)}</span>
                    <span className={m.delta >= 0 ? "tabular row-span-2 text-right font-semibold text-success md:order-3 md:row-span-1" : "tabular row-span-2 text-right font-semibold text-error md:order-3 md:row-span-1"}>
                      {m.delta > 0 ? `+${m.delta}` : m.delta}
                    </span>
                    <span className="min-w-0 truncate text-ink md:order-2">{labelBySku.get(m.sku) ?? m.sku}</span>
                    <span className="col-span-2 text-xs text-ink-muted md:order-4 md:col-span-1 md:min-w-48 md:text-right">
                      {reasonLabel(m.reason)}
                      {m.ref ? ` · ${m.ref}` : ""} · {m.actor}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>

        <div className="flex flex-col gap-4">
          <Panel title={t("pricing")}>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
              <Meta label={t("msrpUsd")}>
                <span className="tabular">US${msrpUsd.toFixed(2)}</span>
              </Meta>
              <Meta label={t("msrpSpot")}>
                <span className="tabular">{formatIDR(Math.round(msrpIdr))}</span>
              </Meta>
              <Meta label={t("landedCost")}>
                <span className="tabular">{formatIDR(landedCostIdr)}</span>
              </Meta>
              <Meta label={t("price")}>
                <span className="tabular text-base font-semibold">{formatIDR(priceIdr)}</span>
              </Meta>
              <Meta label={t("xMsrp")}>
                <span className="tabular">{fmt1(priceIdr / msrpIdr)}×</span>
              </Meta>
              <Meta label={t("xLanded")}>
                <span className="tabular">{fmt1(priceIdr / landedCostIdr)}×</span>
              </Meta>
              <Meta label={t("grossMargin")} className="col-span-2">
                <span className="tabular flex items-center gap-2">
                  {t("marginPerPair", { amount: formatIDR(marginIdr) })}
                  <Badge variant={marginPct >= 35 ? "success" : marginPct >= 25 ? "warning" : "error"}>{marginPct.toFixed(0)}%</Badge>
                </span>
              </Meta>
            </dl>
            <p className="mt-3 text-xs text-ink-muted">
              {t("pricingNote", { rate: SPOT_USD_IDR.toLocaleString("id-ID") })}
            </p>
          </Panel>

          <Panel title={t("preorder")}>
            <PreorderPanel productId={product.id} enabledCount={totals.po} variantCount={product.variants.length} lead={lead} />
          </Panel>
        </div>
      </div>
    </>
  );
}
