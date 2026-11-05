"use client";

import { useLocale, useTranslations } from "next-intl";
import { Check } from "lucide-react";
import type { OrderTimelineEntry } from "@/lib/contracts";
import { formatDateTimeWIB } from "@/lib/format";
import { cn } from "@/lib/utils/cn";
import { CopyButton } from "@/components/ui/copy-button";

export interface OrderTimelineProps {
  /** From OrderPublicView.timeline (Dibuat → Dibayar → Diproses → Dikirim → Terkirim). */
  entries: OrderTimelineEntry[];
  /** Shown on the SHIPPED step (resi + Salin). */
  tracking?: { courier: string; awb: string } | null;
  className?: string;
}

/**
 * Vertical timeline. Done = success dot ✓; current (first not-done) = ink dot; upcoming = border dot.
 * Dates in WIB via formatDateTimeWIB.
 */
export function OrderTimeline({ entries, tracking, className }: OrderTimelineProps) {
  const t = useTranslations("common");
  const locale = useLocale() === "en" ? "en" : "id";
  const currentIdx = entries.findIndex((e) => !e.done);
  return (
    <ol aria-label={t("timeline.title")} className={cn("flex flex-col", className)}>
      {entries.map((e, i) => {
        const state = e.done ? "done" : i === currentIdx ? "current" : "upcoming";
        const last = i === entries.length - 1;
        return (
          <li key={`${e.status}-${i}`} aria-current={state === "current" ? "step" : undefined} className="relative flex gap-4 pb-6 last:pb-0">
            {!last ? (
              <span aria-hidden className={cn("absolute left-[11px] top-6 h-[calc(100%-24px)] w-px", e.done ? "bg-success" : "bg-border")} />
            ) : null}
            <span
              aria-hidden
              className={cn(
                "relative z-10 inline-flex size-6 shrink-0 items-center justify-center rounded-pill",
                state === "done" && "bg-success text-ink-inverse",
                state === "current" && "bg-ink ring-4 ring-surface-alt",
                state === "upcoming" && "border border-border-strong bg-surface",
              )}
            >
              {state === "done" ? <Check size={14} strokeWidth={2.5} /> : state === "current" ? <span className="size-2 rounded-pill bg-ink-inverse" /> : null}
            </span>
            <div className="flex min-w-0 flex-1 flex-col gap-0.5 pt-0.5">
              <span className={cn("text-sm font-semibold", state === "upcoming" ? "text-ink-muted" : "text-ink")}>
                {t(`timeline.steps.${e.status}`)}
                <span className="sr-only"> — {t(`timeline.state.${state}`)}</span>
              </span>
              {e.at ? <span className="text-xs text-ink-muted">{formatDateTimeWIB(new Date(e.at), locale)}</span> : null}
              {e.note ? <span className="text-sm text-ink-muted">{e.note}</span> : null}
              {e.status === "SHIPPED" && tracking && (e.done || state === "current") ? (
                <div className="mt-2 flex flex-wrap items-center gap-2 rounded-sm border border-border px-3 py-1">
                  <span className="text-xs text-ink-muted">{t("timeline.awb", { courier: tracking.courier })}</span>
                  <span className="tabular font-mono text-sm font-medium tracking-[0.04em]">{tracking.awb}</span>
                  <CopyButton value={tracking.awb} ariaLabel={t("timeline.copyAwb")} className="ml-auto" />
                </div>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
