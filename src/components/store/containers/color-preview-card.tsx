"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { ProductSummary } from "@/lib/contracts";
import { cn } from "@/lib/utils/cn";
import { ProductCard } from "@/components/store/product-card";
import { ColorSwatch } from "@/components/store/color-swatch";

/** Swatch buttons shown on a card; the rest is summarised as "+N" (the PDP lists every colour). */
const MAX_PREVIEW_SWATCHES = 5;

export interface ColorPreviewCardProps {
  product: ProductSummary;
  priority?: boolean;
}

function pdpHref(slug: string, color: string | null): string {
  return color ? `/p/${slug}?color=${encodeURIComponent(color)}` : `/p/${slug}`;
}

/**
 * Listing card with colour preview (CAT-02): hover a swatch to see that colour's photo, click/tap to keep it.
 * The kept colour is carried to the PDP link (?color=), so the PDP opens on it.
 */
export function ColorPreviewCard({ product, priority }: ColorPreviewCardProps) {
  const t = useTranslations("common");
  const [selected, setSelected] = React.useState<string | null>(product.matchedColor ?? null);
  const [hovered, setHovered] = React.useState<string | null>(null);

  const shown = hovered ?? selected;
  const image = (shown ? product.colorImages?.[shown] : undefined) ?? product.image;
  const view: ProductSummary = image === product.image ? product : { ...product, image };

  const swatches = product.colors.slice(0, MAX_PREVIEW_SWATCHES);
  const extra = product.colors.length - swatches.length;

  const picker =
    product.colors.length > 1 ? (
      <span className="flex items-center gap-1">
        <span role="group" aria-label={t("variant.color")} className="flex items-center" onMouseLeave={() => setHovered(null)}>
          {swatches.map((c) => (
            <button
              key={c}
              type="button"
              title={c}
              aria-label={t("variant.previewColor", { color: c })}
              aria-pressed={selected === c}
              onMouseEnter={() => setHovered(c)}
              onClick={() => setSelected(c)}
              className={cn(
                "group/sw inline-flex size-7 items-center justify-center rounded-pill",
                "focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-focus",
              )}
            >
              <span className="inline-flex rounded-pill p-0.5 ring-ink group-aria-pressed/sw:ring-2">
                <ColorSwatch color={c} size={16} />
              </span>
            </button>
          ))}
        </span>
        {extra > 0 ? (
          <span className="tabular text-xs text-ink-muted">
            <span aria-hidden>{t("variant.moreColors", { n: extra })}</span>
            <span className="sr-only">{t("variant.colorCount", { n: product.colors.length })}</span>
          </span>
        ) : null}
      </span>
    ) : undefined;

  return <ProductCard product={view} href={pdpHref(product.slug, selected)} linkAs={Link} priority={priority} colorPicker={picker} />;
}
