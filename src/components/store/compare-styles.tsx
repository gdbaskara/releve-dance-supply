import * as React from "react";
import { useTranslations } from "next-intl";
import { formatIDR } from "@/lib/format";
import { cn } from "@/lib/utils/cn";
import { ProductImage } from "./product-image";

export interface CompareItem {
  name: string;
  modelCode: string;
  imageUrl: string | null;
  href: string;
  /** e.g. "Split sole" / "Full sole" (dance terms stay English). */
  sole: string;
  material: string;
  priceIdr: number;
  /** Mark the product currently viewed. */
  current?: boolean;
}

export interface CompareStylesProps {
  items: CompareItem[];
  title?: string;
  linkAs?: React.ElementType;
  className?: string;
}

/** 3-column comparison: photo, name, sole, material, price, link. Scrolls horizontally on small screens. */
export function CompareStyles({ items, title, linkAs: LinkComp = "a", className }: CompareStylesProps) {
  const t = useTranslations("common");
  const cols = items.slice(0, 3);
  const rowCls = "border-t border-border px-3 py-3 text-sm align-top";
  const head = "eyebrow w-24 border-t border-border py-3 pr-3 text-left align-top text-ink-muted";
  return (
    <section className={cn("flex flex-col gap-4", className)}>
      <h2 className="eyebrow text-ink">{title ?? t("product.compareTitle")}</h2>
      <div className="-mx-4 overflow-x-auto px-4">
        <table className="w-full min-w-[560px] table-fixed border-collapse">
          <thead>
            <tr>
              <td className="w-24" />
              {cols.map((c) => (
                <th key={c.modelCode} scope="col" className="px-3 pb-3 text-left align-top font-normal">
                  <LinkComp href={c.href} className="group flex flex-col gap-2 focus-visible:outline-2 focus-visible:outline-focus">
                    <ProductImage src={c.imageUrl} alt={c.name} modelCode={c.modelCode} sizes="180px" />
                    <span className="text-sm font-medium text-ink group-hover:underline">{c.name}</span>
                    <span className="text-xs text-ink-muted">
                      {c.modelCode}
                      {c.current ? ` · ${t("product.current")}` : ""}
                    </span>
                  </LinkComp>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row" className={head}>{t("product.sole")}</th>
              {cols.map((c) => <td key={c.modelCode} className={rowCls}>{c.sole}</td>)}
            </tr>
            <tr>
              <th scope="row" className={head}>{t("product.material")}</th>
              {cols.map((c) => <td key={c.modelCode} className={rowCls}>{c.material}</td>)}
            </tr>
            <tr>
              <th scope="row" className={head}>{t("product.price")}</th>
              {cols.map((c) => (
                <td key={c.modelCode} className={cn(rowCls, "tabular font-semibold")}>
                  {formatIDR(c.priceIdr)}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}
