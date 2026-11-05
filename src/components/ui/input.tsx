"use client";

import * as React from "react";
import { cn } from "@/lib/utils/cn";
import { Field, controlBase } from "./field";

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "prefix"> {
  label?: React.ReactNode;
  helper?: React.ReactNode;
  error?: React.ReactNode;
  optional?: boolean;
  /** Fixed adornment before the value, e.g. "+62". */
  prefix?: React.ReactNode;
  /** Adornment after the value, e.g. "cm" or an icon button. */
  suffix?: React.ReactNode;
  /** Class for the outer field wrapper. */
  wrapperClassName?: string;
}

/** Text input, 48px, label above, helper/error below. States: focus, error, disabled, readOnly. */
export const Input = React.forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, helper, error, optional, prefix, suffix, id, className, wrapperClassName, ...props },
  ref,
) {
  return (
    <Field label={label} helper={helper} error={error} optional={optional} id={id} className={wrapperClassName}>
      {(control) =>
        prefix || suffix ? (
          <div className="relative flex items-stretch">
            {prefix ? (
              <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center border-r border-border pl-3 pr-3 text-base font-medium text-ink-muted">
                {prefix}
              </span>
            ) : null}
            <input
              ref={ref}
              {...control}
              {...props}
              className={cn(controlBase, "h-12", prefix ? "pl-[4.25rem]" : "px-3", suffix ? "pr-12" : "pr-3", className)}
            />
            {suffix ? (
              <span className="absolute inset-y-0 right-0 flex items-center pr-1 text-ink-muted">{suffix}</span>
            ) : null}
          </div>
        ) : (
          <input ref={ref} {...control} {...props} className={cn(controlBase, "h-12 px-3", className)} />
        )
      }
    </Field>
  );
});

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: React.ReactNode;
  helper?: React.ReactNode;
  error?: React.ReactNode;
  optional?: boolean;
  wrapperClassName?: string;
}

/** Multi-line input (min 3 rows). */
export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, helper, error, optional, id, className, wrapperClassName, rows = 3, ...props },
  ref,
) {
  return (
    <Field label={label} helper={helper} error={error} optional={optional} id={id} className={wrapperClassName}>
      {(control) => (
        <textarea ref={ref} rows={rows} {...control} {...props} className={cn(controlBase, "min-h-24 px-3 py-3", className)} />
      )}
    </Field>
  );
});
