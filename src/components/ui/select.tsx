"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Field, controlBase } from "./field";

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "children"> {
  label?: React.ReactNode;
  helper?: React.ReactNode;
  error?: React.ReactNode;
  optional?: boolean;
  options: SelectOption[];
  /** Placeholder shown as an empty first option. */
  placeholder?: string;
  wrapperClassName?: string;
}

/** Native-style select (best on mobile). For long searchable lists use `Combobox`. */
export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, helper, error, optional, options, placeholder, id, className, wrapperClassName, ...props },
  ref,
) {
  return (
    <Field label={label} helper={helper} error={error} optional={optional} id={id} className={wrapperClassName}>
      {(control) => (
        <div className="relative">
          <select
            ref={ref}
            {...control}
            {...props}
            className={cn(controlBase, "h-12 appearance-none pl-3 pr-10", className)}
          >
            {placeholder !== undefined ? (
              <option value="" disabled>
                {placeholder}
              </option>
            ) : null}
            {options.map((o) => (
              <option key={o.value} value={o.value} disabled={o.disabled}>
                {o.label}
              </option>
            ))}
          </select>
          <ChevronDown
            size={20}
            strokeWidth={1.5}
            aria-hidden
            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted"
          />
        </div>
      )}
    </Field>
  );
});
