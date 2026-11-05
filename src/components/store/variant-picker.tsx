"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils/cn";
import { ColorSelector } from "./color-swatch";
import { SizeSelector } from "./size-selector";
import { ShankSelector, WidthSelector } from "./width-shank-selector";
import {
  optionKeys,
  optionValueStates,
  resolveVariant,
  type OptionKey,
  type Selection,
  type VariantSource,
  type VariantState,
} from "./variant-logic";

export interface VariantPickerProps {
  /** ProductDetail (or any object with options + variants [+ colors, widths]). */
  product: VariantSource;
  /** Controlled selection. Omit to let the picker manage its own state. */
  selection?: Selection;
  /** Initial selection when uncontrolled (e.g. colour from ?color=). */
  defaultSelection?: Selection;
  /** Fires on every user change with the resolved state (sku is null until every option is chosen). */
  onChange?: (state: VariantState) => void;
  /** Opens the SizeGuide dialog. */
  onSizeGuide?: () => void;
  sizeGuideHref?: string;
  /** Show "Pilih {option}" errors for missing options (set after Add-to-cart pressed with no size). */
  showMissing?: boolean;
  className?: string;
}

/**
 * Pure presentational picker: Warna → Size → Width → Shank (per `product.options`).
 * Computes availability per value (cascade), disables non-existent combos, marks sold-out ones.
 * Use `resolveVariant(product, selection)` from ./variant-logic to compute the same state on the server.
 */
export function VariantPicker({
  product,
  selection: controlled,
  defaultSelection,
  onChange,
  onSizeGuide,
  sizeGuideHref,
  showMissing,
  className,
}: VariantPickerProps) {
  const t = useTranslations("common");
  const [inner, setInner] = React.useState<Selection>(() => resolveVariant(product, defaultSelection ?? {}).selection);
  const state = resolveVariant(product, controlled ?? inner);
  const sel = state.selection;
  const keys = optionKeys(product);

  const set = (key: OptionKey, value: string) => {
    const next = resolveVariant(product, { ...sel, [key]: value });
    if (!controlled) setInner(next.selection);
    onChange?.(next);
  };

  const missingMsg = (k: OptionKey) =>
    showMissing && state.missing.includes(k) ? t("variant.choose", { option: t(`variant.${k}`) }) : undefined;

  return (
    <div className={cn("flex flex-col gap-6", className)}>
      {keys.map((k) => {
        const states = optionValueStates(product, k, sel);
        if (k === "color") {
          return (
            <ColorSelector
              key={k}
              value={sel.color ?? null}
              onChange={(v) => set("color", v)}
              options={states.map((s) => ({
                value: s.value,
                status: s.status === null ? null : s.status === "SOLD_OUT" ? "soldout" : "available",
              }))}
            />
          );
        }
        if (k === "size") {
          return (
            <SizeSelector
              key={k}
              value={sel.size ?? null}
              onChange={(v) => set("size", v)}
              options={states}
              onSizeGuide={onSizeGuide}
              sizeGuideHref={sizeGuideHref}
              error={missingMsg("size")}
            />
          );
        }
        const Comp = k === "width" ? WidthSelector : ShankSelector;
        return <Comp key={k} value={sel[k] ?? null} onChange={(v) => set(k, v)} options={states} error={missingMsg(k)} />;
      })}
    </div>
  );
}
