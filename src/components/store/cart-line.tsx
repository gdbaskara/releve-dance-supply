"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { X } from "lucide-react";
import type { CartLineView } from "@/lib/contracts";
import { cn } from "@/lib/utils/cn";
import { Badge } from "@/components/ui/badge";
import { Price } from "./price";
import { ProductImage } from "./product-image";
import { QtyStepper } from "./qty-stepper";
import { formatLead } from "./stock-badge";

export interface CartLineProps {
  line: CartLineView;
  onQtyChange?: (sku: string, qty: number) => void;
  onRemove?: (sku: string) => void;
  /** Link to the PDP. */
  href?: string;
  linkAs?: React.ElementType;
  /** Qty is fixed (checkout link prepared by admin) — stepper/remove hidden. */
  locked?: boolean;
  /** Highlight (e.g. stock problem on submit). */
  error?: string;
  className?: string;
}

/** Thumb 64px · name · "Ballet Pink · 7.5 · M" · pre-order badge · qty stepper · line price · remove. */
export function CartLine({ line, onQtyChange, onRemove, href, linkAs: LinkComp = "a", locked, error, className }: CartLineProps) {
  const t = useTranslations("common");
  const name = href ? (
    <LinkComp href={href} className="line-clamp-2 text-sm font-medium text-ink hover:underline focus-visible:outline-2 focus-visible:outline-focus">
      {line.name}
    </LinkComp>
  ) : (
    <span className="line-clamp-2 text-sm font-medium text-ink">{line.name}</span>
  );
  return (
    <div className={cn("flex gap-3 py-4", error && "rounded-md bg-error-bg px-3", className)}>
      <div className="w-16 shrink-0">
        <ProductImage src={line.imageUrl} alt={line.name} sizes="64px" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-start gap-2">
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            {name}
            <span className="text-xs text-ink-muted">
              {line.modelCode} · {line.variantLabel}
            </span>
          </div>
          {!locked && onRemove ? (
            <button
              type="button"
              onClick={() => onRemove(line.sku)}
              aria-label={t("cartDrawer.removeItem", { name: `${line.name} (${line.variantLabel})` })}
              className="-mr-2 -mt-2 inline-flex size-11 shrink-0 items-center justify-center rounded-sm text-ink-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-focus"
            >
              <X size={18} strokeWidth={1.5} aria-hidden />
            </button>
          ) : null}
        </div>
        {line.isPreorder ? (
          <Badge variant="warning" className="self-start">
            {line.preorderLeadWeeks ? t("stock.preorderWeeks", { lead: formatLead(line.preorderLeadWeeks) }) : t("stock.preorder")}
          </Badge>
        ) : null}
        {error ? <p className="text-sm text-error">{error}</p> : null}
        <div className="mt-1 flex items-center justify-between gap-2">
          {locked || !onQtyChange ? (
            <span className="tabular text-sm text-ink-muted">{t("summary.qty", { n: line.qty })}</span>
          ) : (
            <QtyStepper value={line.qty} max={line.maxQty} onChange={(q) => onQtyChange(line.sku, q)} itemName={line.name} />
          )}
          <Price value={line.priceIdr * line.qty} size="sm" />
        </div>
      </div>
    </div>
  );
}
