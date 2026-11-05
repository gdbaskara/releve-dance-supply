"use client";

import { useTranslations } from "next-intl";
import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export interface QtyStepperProps {
  value: number;
  onChange: (qty: number) => void;
  /** Default 1. */
  min?: number;
  /** = available stock, or PREORDER_MAX_QTY (5) for pre-order. */
  max: number;
  disabled?: boolean;
  /** Item name for accessible labels ("Kurangi jumlah SD16"). */
  itemName?: string;
  size?: "md" | "sm";
  className?: string;
}

/** −/value/+ with 44px buttons; buttons disable at the bounds. */
export function QtyStepper({ value, onChange, min = 1, max, disabled, itemName, size = "md", className }: QtyStepperProps) {
  const t = useTranslations("common");
  const btn = cn(
    "inline-flex shrink-0 items-center justify-center text-ink transition-colors hover:bg-surface-alt",
    "focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-focus",
    "disabled:cursor-not-allowed disabled:text-ink-subtle disabled:hover:bg-transparent",
    size === "md" ? "size-11" : "size-9",
  );
  const suffix = itemName ? ` ${itemName}` : "";
  return (
    <div
      role="group"
      aria-label={t("qty.label")}
      className={cn("inline-flex items-center rounded-sm border border-border-strong bg-surface", disabled && "opacity-40", className)}
    >
      <button type="button" className={btn} disabled={disabled || value <= min} onClick={() => onChange(Math.max(min, value - 1))} aria-label={`${t("qty.decrease")}${suffix}`}>
        <Minus size={16} strokeWidth={1.5} aria-hidden />
      </button>
      <output aria-live="polite" className={cn("tabular text-center font-semibold", size === "md" ? "w-10 text-base" : "w-8 text-sm")}>
        {value}
      </output>
      <button type="button" className={btn} disabled={disabled || value >= max} onClick={() => onChange(Math.min(max, value + 1))} aria-label={`${t("qty.increase")}${suffix}`}>
        <Plus size={16} strokeWidth={1.5} aria-hidden />
      </button>
    </div>
  );
}
