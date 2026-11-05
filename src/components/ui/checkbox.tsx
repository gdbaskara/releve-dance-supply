"use client";

import * as React from "react";
import { Checkbox as RCheckbox } from "radix-ui";
import { Check, Minus } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export interface CheckboxProps
  extends Omit<React.ComponentPropsWithoutRef<typeof RCheckbox.Root>, "children"> {
  /** Visible label. The whole row (min 44px) is clickable. */
  label?: React.ReactNode;
  /** Secondary line under the label. */
  description?: React.ReactNode;
  /** Error message; marks the control invalid. */
  error?: React.ReactNode;
  /** Content aligned to the right of the label (e.g. a price). */
  aside?: React.ReactNode;
}

/** 20px checkbox with 44px hit area. States: checked, unchecked, indeterminate, focus, disabled, error. */
export const Checkbox = React.forwardRef<HTMLButtonElement, CheckboxProps>(function Checkbox(
  { label, description, error, aside, id, className, disabled, ...props },
  ref,
) {
  const autoId = React.useId();
  const cid = id ?? `cb${autoId}`;
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <label
        htmlFor={cid}
        className={cn("flex min-h-11 cursor-pointer items-start gap-3 py-2.5", disabled && "cursor-not-allowed opacity-40")}
      >
        <RCheckbox.Root
          ref={ref}
          id={cid}
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          aria-describedby={description || error ? `${cid}-d` : undefined}
          className={cn(
            "peer mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-sm border border-border-strong bg-surface",
            "data-[state=checked]:border-ink data-[state=checked]:bg-ink data-[state=checked]:text-ink-inverse",
            "data-[state=indeterminate]:border-ink data-[state=indeterminate]:bg-ink data-[state=indeterminate]:text-ink-inverse",
            "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus",
            "aria-invalid:border-error",
          )}
          {...props}
        >
          <RCheckbox.Indicator>
            {props.checked === "indeterminate" ? (
              <Minus size={14} strokeWidth={2.5} aria-hidden />
            ) : (
              <Check size={14} strokeWidth={2.5} aria-hidden />
            )}
          </RCheckbox.Indicator>
        </RCheckbox.Root>
        {label || description ? (
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            {label ? <span className="text-base text-ink">{label}</span> : null}
            {description ? (
              <span id={`${cid}-d`} className="text-sm text-ink-muted">
                {description}
              </span>
            ) : null}
          </span>
        ) : null}
        {aside ? <span className="tabular shrink-0 text-sm font-semibold text-ink">{aside}</span> : null}
      </label>
      {error ? (
        <p id={description ? undefined : `${cid}-d`} className="text-sm text-error">
          {error}
        </p>
      ) : null}
    </div>
  );
});
