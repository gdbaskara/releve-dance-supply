"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { CircleExclamationPoint } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export interface FieldProps {
  /** Visible label (14px 500, above the control). */
  label?: React.ReactNode;
  /** Helper text below the control. Replaced by `error` when present. */
  helper?: React.ReactNode;
  /** Error message — sets aria-invalid on the control and shows the message in `error` color. */
  error?: React.ReactNode;
  /** Shows "(Opsional)" next to the label. */
  optional?: boolean;
  /** id of the control; generated when omitted. */
  id?: string;
  className?: string;
  /** Render prop receiving the ids/aria attributes to spread onto the control. */
  children: (control: FieldControlProps) => React.ReactNode;
}

export interface FieldControlProps {
  id: string;
  "aria-invalid"?: true;
  "aria-describedby"?: string;
}

/** Label + control + helper/error wiring. Used by Input, Textarea, Select, Combobox, PhoneInput. */
export function Field({ label, helper, error, optional, id, className, children }: FieldProps) {
  const t = useTranslations("common");
  const autoId = React.useId();
  const controlId = id ?? `f${autoId}`;
  const msgId = `${controlId}-msg`;
  const hasMsg = Boolean(error || helper);
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label ? (
        <label htmlFor={controlId} className="text-sm font-medium text-ink">
          {label}
          {optional ? <span className="font-normal text-ink-muted"> ({t("optional")})</span> : null}
        </label>
      ) : null}
      {children({
        id: controlId,
        "aria-invalid": error ? true : undefined,
        "aria-describedby": hasMsg ? msgId : undefined,
      })}
      {error ? (
        <p id={msgId} className="flex items-start gap-1.5 text-sm text-error">
          <CircleExclamationPoint size={16} strokeWidth={1.5} className="mt-0.5 shrink-0" aria-hidden />
          <span>{error}</span>
        </p>
      ) : helper ? (
        <p id={msgId} className="text-sm text-ink-muted">
          {helper}
        </p>
      ) : null}
    </div>
  );
}

/** Shared control box styles (48px, border-strong, focus = 2px ink border, error = error border). */
export const controlBase = cn(
  "w-full rounded-sm border border-border-strong bg-surface text-base text-ink placeholder:text-ink-subtle",
  "transition-[border-color,box-shadow] duration-150",
  "focus:border-ink focus:shadow-[inset_0_0_0_1px_var(--color-ink)] focus:outline-none",
  "aria-invalid:border-error aria-invalid:focus:shadow-[inset_0_0_0_1px_var(--color-error)]",
  "disabled:cursor-not-allowed disabled:bg-surface-alt disabled:text-ink-muted",
);
/** readOnly styling — only for input/textarea (a <select> always matches :read-only). */
export const readOnlyCls = "read-only:bg-surface-alt";
