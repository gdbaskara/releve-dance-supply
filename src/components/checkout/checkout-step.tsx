"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Check, Lock } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export type CheckoutStepStatus = "active" | "done" | "locked";

export interface CheckoutStepProps {
  number: number;
  title: React.ReactNode;
  status: CheckoutStepStatus;
  /** Shown when `done` (e.g. "Rina · +62 812-3456-7890 · Jakarta Selatan"). */
  summary?: React.ReactNode;
  /** "Ubah" → re-open the step. */
  onEdit?: () => void;
  /** Step body (rendered only when active). */
  children?: React.ReactNode;
  /** Footer for active step (e.g. "Lanjut" button on mobile). */
  footer?: React.ReactNode;
  id?: string;
  className?: string;
}

/** Numbered checkout section: active (open) · done (✓ + summary + "Ubah") · locked (muted). */
export function CheckoutStep({ number, title, status, summary, onEdit, children, footer, id, className }: CheckoutStepProps) {
  const t = useTranslations("common");
  const headingId = React.useId();
  return (
    <section
      id={id}
      aria-labelledby={headingId}
      aria-current={status === "active" ? "step" : undefined}
      className={cn("border-b border-border py-6", className)}
    >
      <div className="flex items-start gap-4">
        <span
          aria-hidden
          className={cn(
            "tabular inline-flex size-8 shrink-0 items-center justify-center rounded-pill text-sm font-semibold",
            status === "active" && "bg-ink text-ink-inverse",
            status === "done" && "bg-success-bg text-success",
            status === "locked" && "border border-border text-ink-subtle",
          )}
        >
          {status === "done" ? <Check size={16} strokeWidth={2} /> : number}
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-1 pt-1">
          <div className="flex items-center justify-between gap-4">
            <h2 id={headingId} className={cn("eyebrow", status === "locked" ? "text-ink-subtle" : "text-ink")}>
              <span className="sr-only">{t("step.stepN", { n: number })}: </span>
              {title}
              {status === "done" ? <span className="sr-only"> — {t("step.done")}</span> : null}
              {status === "locked" ? <span className="sr-only"> — {t("step.locked")}</span> : null}
            </h2>
            {status === "done" && onEdit ? (
              <button
                type="button"
                onClick={onEdit}
                className="-my-2 min-h-11 text-sm font-medium text-ink underline underline-offset-[3px] hover:text-accent-strong focus-visible:outline-2 focus-visible:outline-focus"
              >
                {t("edit")}
              </button>
            ) : null}
            {status === "locked" ? <Lock size={16} strokeWidth={1.5} aria-hidden className="text-ink-subtle" /> : null}
          </div>
          {status === "done" && summary ? <div className="text-sm text-ink-muted">{summary}</div> : null}
        </div>
      </div>
      {status === "active" ? (
        <div className="mt-6 flex flex-col gap-6 md:pl-12">
          {children}
          {footer}
        </div>
      ) : null}
    </section>
  );
}
