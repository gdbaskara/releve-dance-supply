"use client";

import * as React from "react";
import { RadioGroup as RRadio } from "radix-ui";
import { cn } from "@/lib/utils/cn";

export interface RadioGroupProps extends React.ComponentPropsWithoutRef<typeof RRadio.Root> {
  /** Accessible group label (visually rendered as a legend when `showLegend`). */
  legend?: React.ReactNode;
  showLegend?: boolean;
  error?: React.ReactNode;
}

/** Radix RadioGroup wrapper: arrow-key navigation, single tab stop. Children: `Radio` or `RadioCard`. */
export const RadioGroup = React.forwardRef<HTMLDivElement, RadioGroupProps>(function RadioGroup(
  { legend, showLegend = false, error, className, children, ...props },
  ref,
) {
  const legendId = React.useId();
  return (
    <div className="flex flex-col gap-2">
      {legend ? (
        <span id={legendId} className={cn(showLegend ? "eyebrow text-ink-muted" : "sr-only")}>
          {legend}
        </span>
      ) : null}
      <RRadio.Root
        ref={ref}
        aria-labelledby={legend ? legendId : undefined}
        aria-invalid={error ? true : undefined}
        className={cn("flex flex-col gap-2", className)}
        {...props}
      >
        {children}
      </RRadio.Root>
      {error ? <p className="text-sm text-error">{error}</p> : null}
    </div>
  );
});

const dot = cn(
  "inline-flex size-5 shrink-0 items-center justify-center rounded-pill border border-border-strong bg-surface",
  "group-data-[state=checked]:border-ink",
);

export interface RadioProps extends React.ComponentPropsWithoutRef<typeof RRadio.Item> {
  label: React.ReactNode;
  description?: React.ReactNode;
}

/** Plain radio row (20px control, 44px row). */
export const Radio = React.forwardRef<HTMLButtonElement, RadioProps>(function Radio(
  { label, description, className, ...props },
  ref,
) {
  return (
    <RRadio.Item
      ref={ref}
      className={cn(
        "group flex min-h-11 w-full items-start gap-3 rounded-sm py-2.5 text-left",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus",
        "disabled:cursor-not-allowed disabled:opacity-40",
        className,
      )}
      {...props}
    >
      <span className={cn(dot, "mt-0.5")}>
        <RRadio.Indicator className="size-2.5 rounded-pill bg-ink" />
      </span>
      <span className="flex flex-col gap-0.5">
        <span className="text-base text-ink">{label}</span>
        {description ? <span className="text-sm text-ink-muted">{description}</span> : null}
      </span>
    </RRadio.Item>
  );
});

export interface RadioCardProps extends Omit<React.ComponentPropsWithoutRef<typeof RRadio.Item>, "title"> {
  /** Left visual (logo tile, icon). */
  media?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Right-aligned content (price). */
  aside?: React.ReactNode;
  /** Hide the radio dot (selection shown by the 2px ink border only). */
  hideIndicator?: boolean;
}

/**
 * Selectable card (radius 4px). Selected = 2px ink border. Used by CourierOption & PaymentMethodTile.
 * Must be rendered inside `RadioGroup`.
 */
export const RadioCard = React.forwardRef<HTMLButtonElement, RadioCardProps>(function RadioCard(
  { media, title, description, aside, hideIndicator, className, children, ...props },
  ref,
) {
  return (
    <RRadio.Item
      ref={ref}
      className={cn(
        "group relative flex min-h-16 w-full items-center gap-3 rounded-md border border-border bg-surface px-4 py-3 text-left",
        "transition-colors duration-150 hover:border-border-strong",
        "data-[state=checked]:border-ink data-[state=checked]:shadow-[inset_0_0_0_1px_var(--color-ink)]",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus",
        "disabled:cursor-not-allowed disabled:opacity-40",
        className,
      )}
      {...props}
    >
      {hideIndicator ? null : (
        <span className={dot}>
          <RRadio.Indicator className="size-2.5 rounded-pill bg-ink" />
        </span>
      )}
      {media ? <span className="shrink-0">{media}</span> : null}
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-sm font-semibold text-ink">{title}</span>
        {description ? <span className="text-sm text-ink-muted">{description}</span> : null}
        {children}
      </span>
      {aside ? <span className="tabular shrink-0 text-right text-sm font-semibold text-ink">{aside}</span> : null}
    </RRadio.Item>
  );
});
