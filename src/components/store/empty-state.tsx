import * as React from "react";
import { cn } from "@/lib/utils/cn";

export interface EmptyStateProps {
  /** Line-art icon (lucide, strokeWidth 1, ~40px) or illustration. */
  icon?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  /** CTA(s): "Kembali belanja" and/or WhatsAppButton. */
  actions?: React.ReactNode;
  className?: string;
}

/** Centered empty/no-results state. */
export function EmptyState({ icon, title, description, actions, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center gap-3 px-4 py-12 text-center", className)}>
      {icon ? <div className="mb-2 flex size-20 items-center justify-center rounded-pill bg-surface-alt text-ink-muted">{icon}</div> : null}
      <h3 className="text-lg font-semibold text-ink">{title}</h3>
      {description ? <p className="max-w-sm text-sm text-ink-muted">{description}</p> : null}
      {actions ? <div className="mt-3 flex flex-col items-center gap-3 md:flex-row">{actions}</div> : null}
    </div>
  );
}
