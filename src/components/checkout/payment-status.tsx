"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { CircleCheck, CircleX, TimerOff } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Spinner } from "@/components/ui/spinner";

export type PaymentStatusKind = "waiting" | "paid" | "expired" | "failed";

export interface PaymentStatusProps {
  status: PaymentStatusKind;
  /** Override title/body (defaults from common.paymentStatus.*). */
  title?: React.ReactNode;
  description?: React.ReactNode;
  /** CTAs under the text ("Pesan lagi", "Lacak pesanan", WA…). */
  actions?: React.ReactNode;
  /** compact = inline row (pay page header) · full = centred block (success/expired pages). */
  appearance?: "full" | "compact";
  className?: string;
}

const tone = {
  waiting: "bg-surface-alt text-ink",
  paid: "bg-success-bg text-success",
  expired: "bg-warning-bg text-warning",
  failed: "bg-error-bg text-error",
} as const;

/** Waiting (subtle spinner) · Paid (success) · Expired · Failed. role=status for live updates from polling. */
export function PaymentStatus({ status, title, description, actions, appearance = "full", className }: PaymentStatusProps) {
  const t = useTranslations("common");
  const icon =
    status === "waiting" ? (
      <Spinner size={appearance === "full" ? 28 : 18} />
    ) : status === "paid" ? (
      <CircleCheck size={appearance === "full" ? 32 : 18} strokeWidth={1.5} aria-hidden />
    ) : status === "expired" ? (
      <TimerOff size={appearance === "full" ? 32 : 18} strokeWidth={1.5} aria-hidden />
    ) : (
      <CircleX size={appearance === "full" ? 32 : 18} strokeWidth={1.5} aria-hidden />
    );
  const head = title ?? t(`paymentStatus.${status}.title`);
  const body = description ?? t(`paymentStatus.${status}.body`);

  if (appearance === "compact") {
    return (
      <div role="status" className={cn("inline-flex items-center gap-2 rounded-sm px-3 py-2 text-sm font-medium", tone[status], className)}>
        {icon}
        <span>{head}</span>
      </div>
    );
  }
  return (
    <div role="status" className={cn("flex flex-col items-center gap-3 text-center", className)}>
      <span className={cn("inline-flex size-16 items-center justify-center rounded-pill", tone[status])}>{icon}</span>
      <h2 className="text-2xl font-semibold text-ink">{head}</h2>
      <p className="max-w-sm text-sm text-ink-muted">{body}</p>
      {actions ? <div className="mt-2 flex w-full max-w-sm flex-col gap-3">{actions}</div> : null}
    </div>
  );
}
