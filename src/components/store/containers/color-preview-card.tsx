"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { ProductSummary } from "@/lib/contracts";
import { cn } from "@/lib/utils/cn";
import { ProductCard } from "@/components/store/product-card";
import { ColorSwatch } from "@/components/store/color-swatch";

/** Swatch buttons per card: 44px targets fit 3 on a phone-width card, 5 from lg. The rest is "+N". */
const SWATCHES_NARROW = 3;
const SWATCHES_WIDE = 5;

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

  const swatches = product.colors.slice(0, SWATCHES_WIDE);
  const extraNarrow = product.colors.length - Math.min(product.colors.length, SWATCHES_NARROW);
  const extraWide = product.colors.length - swatches.length;

  const picker =
    product.colors.length > 1 ? (
      <span className="-ml-3 flex items-center">
        <span role="group" aria-label={t("variant.color")} className="flex items-center" onMouseLeave={() => setHovered(null)}>
          {swatches.map((c, i) => (
            <button
              key={c}
              type="button"
              title={c}
              aria-label={t("variant.previewColor", { color: c })}
              aria-pressed={selected === c}
              onMouseEnter={() => setHovered(c)}
              onClick={() => setSelected(c)}
              className={cn(
                "group/sw inline-flex size-11 items-center justify-center rounded-pill",
                "focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-focus",
                i >= SWATCHES_NARROW && "max-lg:hidden",
              )}
            >
              <span className="inline-flex rounded-pill p-0.5 ring-ink group-aria-pressed/sw:ring-2">
                <ColorSwatch color={c} size={16} />
              </span>
            </button>
          ))}
        </span>
        {extraNarrow > 0 ? (
          <span aria-hidden className={cn("tabular text-xs text-ink-muted", extraWide === 0 && "lg:hidden")}>
            <span className="lg:hidden">{t("variant.moreColors", { n: extraNarrow })}</span>
            {extraWide > 0 ? <span className="max-lg:hidden">{t("variant.moreColors", { n: extraWide })}</span> : null}
          </span>
        ) : null}
        {extraNarrow > 0 ? <span className="sr-only">{t("variant.colorCount", { n: product.colors.length })}</span> : null}
      </span>
    ) : undefined;

  return <ProductCard product={view} href={pdpHref(product.slug, selected)} linkAs={Link} priority={priority} colorPicker={picker} />;
}
