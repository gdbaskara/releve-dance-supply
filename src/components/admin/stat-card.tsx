import Link from "next/link";
import * as React from "react";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export interface StatCardProps {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  href?: string;
  /** Emphasise when the number needs attention (> 0). */
  tone?: "default" | "warning" | "info" | "error";
  icon?: React.ReactNode;
}

const toneCls = {
  default: "text-ink-muted bg-surface-alt",
  warning: "text-warning bg-warning-bg",
  info: "text-info bg-info-bg",
  error: "text-error bg-error-bg",
} as const;

/** Dashboard KPI tile (docs/07 §7.4 StatCard). */
export function StatCard({ label, value, hint, href, tone = "default", icon }: StatCardProps) {
  const body = (
    <>
      <div className="flex items-start justify-between gap-2">
        <span className="text-sm font-medium text-ink-muted">{label}</span>
        {icon ? <span className={cn("inline-flex size-8 items-center justify-center rounded-md", toneCls[tone])}>{icon}</span> : null}
      </div>
      <span className="tabular text-3xl font-semibold text-ink" data-testid="stat-value">
        {value}
      </span>
      {hint || href ? (
        <span className="flex items-center justify-between gap-2 text-xs text-ink-muted">
          <span>{hint}</span>
          {href ? <ArrowRight size={16} strokeWidth={1.5} aria-hidden className="text-ink" /> : null}
        </span>
      ) : null}
    </>
  );
  const cls = "flex flex-col gap-2 rounded-lg border border-border bg-surface p-4";
  return href ? (
    <Link href={href} className={cn(cls, "transition-colors hover:border-border-strong focus-visible:outline-2 focus-visible:outline-focus")} aria-label={`${label}: ${typeof value === "number" ? value : ""}`}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}
