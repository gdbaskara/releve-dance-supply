"use client";

import * as React from "react";
import { RadioGroup as RRadio } from "radix-ui";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils/cn";
import { isLightSwatch, swatchBackground } from "./swatch-colors";

export interface ColorSwatchProps {
  color: string;
  /** px. Default 28 (selector); 16 on cards. */
  size?: number;
  soldOut?: boolean;
  className?: string;
}

/** Decorative round swatch (pill, 1px border-strong). Sold out = diagonal line. */
export function ColorSwatch({ color, size = 28, soldOut, className }: ColorSwatchProps) {
  return (
    <span
      aria-hidden
      className={cn("relative inline-block shrink-0 overflow-hidden rounded-pill border", isLightSwatch(color) ? "border-border-strong" : "border-border", className)}
      style={{ width: size, height: size, background: swatchBackground(color) }}
    >
      {soldOut ? (
        <span className="absolute left-1/2 top-[-10%] h-[120%] w-px -translate-x-1/2 rotate-45 bg-ink" />
      ) : null}
    </span>
  );
}

export interface ColorSwatchesProps {
  colors: string[];
  /** Max swatches before "+N". Default 5. */
  max?: number;
  size?: number;
  className?: string;
}

/** Compact swatch row for ProductCard: max 5 + "+N". Accessible text lists the colour count. */
export function ColorSwatches({ colors, max = 5, size = 14, className }: ColorSwatchesProps) {
  const t = useTranslations("common");
  const shown = colors.slice(0, max);
  const extra = colors.length - shown.length;
  return (
    <span className={cn("flex items-center gap-1.5", className)}>
      <span className="sr-only">{t("variant.colorCount", { n: colors.length })}</span>
      {shown.map((c) => (
        <ColorSwatch key={c} color={c} size={size} />
      ))}
      {extra > 0 ? (
        <span aria-hidden className="tabular text-xs text-ink-muted">
          {t("variant.moreColors", { n: extra })}
        </span>
      ) : null}
    </span>
  );
}

export interface ColorSelectorOption {
  value: string;
  /** null = not offered for current selection (disabled). */
  status: "available" | "soldout" | null;
}

export interface ColorSelectorProps {
  options: ColorSelectorOption[];
  value: string | null;
  onChange: (color: string) => void;
  label?: string;
  className?: string;
}

/** "Warna: Ballet Pink" + 28px swatches as a radiogroup (selected = 2px ink ring offset 2). */
export function ColorSelector({ options, value, onChange, label, className }: ColorSelectorProps) {
  const t = useTranslations("common");
  const groupLabel = label ?? t("variant.color");
  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <p className="text-sm text-ink">
        <span className="eyebrow mr-2 text-ink-muted">{groupLabel}</span>
        <span className="font-medium">{value ?? "—"}</span>
      </p>
      <RRadio.Root aria-label={groupLabel} value={value ?? ""} onValueChange={onChange} orientation="horizontal" className="flex flex-wrap gap-1">
        {options.map((o) => (
          <RRadio.Item
            key={o.value}
            value={o.value}
            disabled={o.status === null}
            aria-label={o.status === "soldout" ? `${o.value}, ${t("stock.soldout")}` : o.value}
            title={o.value}
            className={cn(
              "group inline-flex size-11 items-center justify-center rounded-pill",
              "focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-focus",
              "disabled:cursor-not-allowed disabled:opacity-30",
            )}
          >
            <span className="rounded-pill p-0.5 ring-ink group-data-[state=checked]:ring-2">
              <ColorSwatch color={o.value} soldOut={o.status === "soldout"} />
            </span>
          </RRadio.Item>
        ))}
      </RRadio.Root>
    </div>
  );
}
