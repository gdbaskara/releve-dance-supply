import * as React from "react";
import { cn } from "@/lib/utils/cn";

export interface ChipProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Toggle state (aria-pressed). Selected = ink background, white text. */
  selected?: boolean;
  /** Optional trailing count, e.g. facet count. */
  count?: number;
}

/** Pill filter chip, 36px tall (44px hit area via padding wrapper is the caller's job in dense rows). */
export const Chip = React.forwardRef<HTMLButtonElement, ChipProps>(function Chip(
  { selected = false, count, className, children, type, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type ?? "button"}
      aria-pressed={selected}
      className={cn(
        "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-pill border px-4 text-sm font-medium transition-colors duration-150",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus",
        "disabled:cursor-not-allowed disabled:opacity-40",
        selected
          ? "border-ink bg-ink text-ink-inverse"
          : "border-border-strong bg-surface text-ink hover:bg-surface-alt",
        className,
      )}
      {...props}
    >
      {children}
      {count !== undefined ? (
        <span className={cn("tabular text-xs", selected ? "text-ink-inverse" : "text-ink-muted")}>{count}</span>
      ) : null}
    </button>
  );
});
