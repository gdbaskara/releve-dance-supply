import * as React from "react";
import { CircleCheck, CircleExclamationPoint, Info, TriangleExclamationPoint } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export type NoticeTone = "info" | "success" | "warning" | "error" | "neutral" | "accent";

export interface NoticeProps {
  tone?: NoticeTone;
  title?: React.ReactNode;
  children?: React.ReactNode;
  /** Actions rendered under the text (buttons/links). */
  actions?: React.ReactNode;
  /** Hide the leading icon. */
  noIcon?: boolean;
  /** Use role="alert" (errors after submit). Default role="status" for non-error tones. */
  live?: boolean;
  className?: string;
}

const toneCls: Record<NoticeTone, string> = {
  info: "bg-info-bg text-info",
  success: "bg-success-bg text-success",
  warning: "bg-warning-bg text-warning",
  error: "bg-error-bg text-error",
  neutral: "bg-surface-alt text-ink-muted",
  accent: "bg-accent text-accent-ink",
};
const icon: Record<NoticeTone, React.ComponentType<{ size?: number; strokeWidth?: number; className?: string; "aria-hidden"?: boolean }>> = {
  info: Info,
  success: CircleCheck,
  warning: TriangleExclamationPoint,
  error: CircleExclamationPoint,
  neutral: Info,
  accent: Info,
};

/** Inline callout (pointe advice, cart stock changes, demo notice, checkout errors). Radius 4px. */
export function Notice({ tone = "info", title, children, actions, noIcon, live, className }: NoticeProps) {
  const Icon = icon[tone];
  return (
    <div
      role={live ? "alert" : undefined}
      className={cn("flex gap-3 rounded-md px-4 py-3 text-sm", toneCls[tone], className)}
    >
      {noIcon ? null : <Icon size={20} strokeWidth={1.5} aria-hidden className="mt-px shrink-0" />}
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        {title ? <p className="font-semibold">{title}</p> : null}
        {children ? <div className="text-ink">{children}</div> : null}
        {actions ? <div className="mt-1 flex flex-wrap gap-2">{actions}</div> : null}
      </div>
    </div>
  );
}
