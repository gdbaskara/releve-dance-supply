"use client";

import * as React from "react";
import { RadioGroup as RRadio } from "radix-ui";
import { useTranslations } from "next-intl";
import { Ruler } from "lucide-react";
import type { StockStatus } from "@/lib/contracts";
import { cn } from "@/lib/utils/cn";
import { splitSize } from "./variant-logic";

export interface SizeOptionState {
  value: string;
  /** null = combination doesn't exist → disabled (not focusable). */
  status: StockStatus | null;
  available?: number;
  leadWeeks?: string | null;
}

export interface SizeSelectorProps {
  options: SizeOptionState[];
  value: string | null;
  onChange: (size: string) => void;
  label?: string;
  /** Renders the "Panduan ukuran" button (opens SizeGuide dialog). */
  onSizeGuide?: () => void;
  /** Or render it as a link (full-page /size-guide). */
  sizeGuideHref?: string;
  /** Highlights the group (e.g. Add pressed without size). */
  error?: string;
  className?: string;
}

/**
 * Grid of 48×48 square chips with US sizes. Selected = ink bg; LOW = warning dot; PREORDER = "PO";
 * SOLD_OUT = struck-through + ink-subtle, still focusable/selectable with aria-disabled so the PDP can
 * offer "Kabari saya". Sizes with a "(toddler)/(child)/(adult)" suffix are grouped.
 */
export function SizeSelector({ options, value, onChange, label, onSizeGuide, sizeGuideHref, error, className }: SizeSelectorProps) {
  const t = useTranslations("common");
  const groupLabel = label ?? t("variant.size");
  const errId = React.useId();

  const groups: { key: string | null; items: SizeOptionState[] }[] = [];
  for (const o of options) {
    const g = splitSize(o.value).group;
    const last = groups[groups.length - 1];
    if (last && last.key === g) last.items.push(o);
    else groups.push({ key: g, items: [o] });
  }
  const showGroups = groups.length > 1;
  const groupName = (g: string) => (["toddler", "child", "adult"].includes(g) ? t(`sizeGroups.${g}` as "sizeGroups.adult") : g);

  const guide = onSizeGuide ? (
    <button type="button" onClick={onSizeGuide} className="inline-flex min-h-11 items-center gap-1.5 text-sm text-ink underline underline-offset-[3px] hover:text-accent-strong">
      <Ruler size={16} strokeWidth={1.5} aria-hidden />
      {t("variant.sizeGuide")}
    </button>
  ) : sizeGuideHref ? (
    <a href={sizeGuideHref} className="inline-flex min-h-11 items-center gap-1.5 text-sm text-ink underline underline-offset-[3px] hover:text-accent-strong">
      <Ruler size={16} strokeWidth={1.5} aria-hidden />
      {t("variant.sizeGuide")}
    </a>
  ) : null;

  const selected = options.find((o) => o.value === value);

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-ink">
          <span className="eyebrow mr-2 text-ink-muted">{groupLabel}</span>
          <span className="font-medium">{selected ? splitSize(selected.value).short : ""}</span>
        </p>
        {guide}
      </div>
      <RRadio.Root
        aria-label={groupLabel}
        aria-describedby={error ? errId : undefined}
        value={value ?? ""}
        onValueChange={onChange}
        className="flex flex-col gap-3"
      >
        {groups.map((g, gi) => (
          <div key={`${g.key}-${gi}`} className="flex flex-col gap-2">
            {showGroups && g.key ? <span className="text-xs text-ink-muted">{groupName(g.key)}</span> : null}
            <div className="flex flex-wrap gap-2">
              {g.items.map((o) => {
                const { short } = splitSize(o.value);
                const sold = o.status === "SOLD_OUT";
                const hint =
                  o.status === "SOLD_OUT"
                    ? t("stock.soldout")
                    : o.status === "LOW"
                      ? t("stock.low", { n: o.available ?? 0 })
                      : o.status === "PREORDER"
                        ? t("stock.preorder")
                        : undefined;
                return (
                  <RRadio.Item
                    key={o.value}
                    value={o.value}
                    disabled={o.status === null}
                    aria-disabled={sold || undefined}
                    aria-label={hint ? `${short}, ${hint}` : short}
                    className={cn(
                      "relative inline-flex h-12 min-w-12 items-center justify-center rounded-sm border px-2 text-sm font-medium tabular transition-colors duration-150",
                      "border-border-strong bg-surface text-ink hover:border-ink",
                      "data-[state=checked]:border-ink data-[state=checked]:bg-ink data-[state=checked]:text-ink-inverse",
                      "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus",
                      "disabled:cursor-not-allowed disabled:border-border disabled:text-ink-subtle disabled:opacity-50 disabled:hover:border-border",
                      sold && "border-border text-ink-subtle line-through data-[state=checked]:border-ink-muted data-[state=checked]:bg-ink-muted",
                      error && !value && "border-error",
                    )}
                  >
                    {short}
                    {o.status === "LOW" ? (
                      <span aria-hidden className="absolute right-1 top-1 size-1.5 rounded-pill bg-warning" />
                    ) : null}
                    {o.status === "PREORDER" ? (
                      <span aria-hidden className="absolute -top-2 right-0.5 rounded-sm bg-warning-bg px-1 text-[10px] font-semibold leading-4 text-warning">
                        {t("variant.preorderShort")}
                      </span>
                    ) : null}
                  </RRadio.Item>
                );
              })}
            </div>
          </div>
        ))}
      </RRadio.Root>
      {error ? (
        <p id={errId} className="text-sm text-error">
          {error}
        </p>
      ) : null}
    </div>
  );
}
