import * as React from "react";
import { useTranslations } from "next-intl";
import type { ProductSummary } from "@/lib/contracts";
import { cn } from "@/lib/utils/cn";
import { Price } from "./price";
import { StockBadge } from "./stock-badge";
import { ColorSwatches } from "./color-swatch";
import { ProductImage } from "./product-image";

export interface ProductCardProps {
  product: ProductSummary;
  /** Link target, e.g. `/p/${slug}` (use with next-intl Link via `linkAs`). */
  href: string;
  /** Units left when `product.status` is LOW (aggregate) → "Sisa {n}". Omit → "Stok terbatas". */
  lowStockCount?: number;
  /** Second image for desktop hover. */
  hoverImageUrl?: string | null;
  /** Prefix price with "Mulai". */
  priceFrom?: boolean;
  /** Small accent badge (e.g. "Baru"). Use sparingly. */
  tag?: string;
  /** Link component. Default "a"; pass next-intl `Link` from a client/server parent. */
  linkAs?: React.ElementType;
  priority?: boolean;
  className?: string;
}

/**
 * Listing card. Whole card is one link; no add-to-cart (size must be chosen on PDP).
 * 1:1 image · eyebrow discipline · name (2 lines) · model code · price · swatches (5 + "+N") · stock badge.
 */
export function ProductCard({ product, href, lowStockCount, hoverImageUrl, priceFrom, tag, linkAs: LinkComp = "a", priority, className }: ProductCardProps) {
  const t = useTranslations("common");
  const discipline = product.audience === "Kids" ? `${product.discipline} · Kids` : product.discipline;
  return (
    <LinkComp
      href={href}
      className={cn(
        "group flex flex-col gap-3 rounded-sm text-ink",
        "focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus",
        className,
      )}
    >
      <div className="relative">
        <ProductImage
          src={product.image?.url}
          alt={product.image?.alt ?? product.name}
          modelCode={product.modelCode}
          hoverSrc={hoverImageUrl}
          priority={priority}
        />
        <div className="absolute left-2 top-2 flex flex-col items-start gap-1">
          {tag ? <span className="eyebrow rounded-sm bg-accent px-2 py-1 text-accent-ink">{tag}</span> : null}
          {product.status !== "READY" ? <StockBadge status={product.status} available={lowStockCount} className={product.status === "SOLD_OUT" ? "bg-surface" : undefined} /> : null}
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <span className="eyebrow text-ink-muted">{discipline}</span>
        <span className="line-clamp-2 text-sm font-medium leading-5 group-hover:underline group-hover:underline-offset-[3px] md:text-base md:leading-6">
          {product.name}
        </span>
        <span className="text-xs text-ink-muted">{t("product.modelCode", { code: product.modelCode })}</span>
        <Price value={product.priceIdr} size="sm" from={priceFrom} className="mt-1" />
        <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
          {product.colors.length > 0 ? <ColorSwatches colors={product.colors} /> : <span />}
          {product.status === "READY" ? <StockBadge status="READY" /> : null}
        </div>
      </div>
    </LinkComp>
  );
}
