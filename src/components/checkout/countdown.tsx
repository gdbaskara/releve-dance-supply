"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Clock, TimerOff } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Button } from "@/components/ui/button";

export const WARNING_THRESHOLD_MS = 5 * 60 * 1000;

/** ms → "HH:MM:SS" (or "MM:SS" when `short` and < 1h). */
export function formatRemaining(ms: number, short = false): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const p = (n: number) => String(n).padStart(2, "0");
  return short && h === 0 ? `${p(m)}:${p(sec)}` : `${p(h)}:${p(m)}:${p(sec)}`;
}

/**
 * Ticks every second until `expiresAt`; calls `onExpire` once when it reaches 0 (also if already expired
 * on mount). Returns remaining ms.
 */
export function useCountdown(expiresAt: Date | string | number, onExpire?: () => void): number {
  const target = new Date(expiresAt).getTime();
  const [now, setNow] = React.useState(() => Date.now());
  const remaining = Math.max(0, target - now);
  const expired = remaining <= 0;
  const cb = React.useRef(onExpire);
  const fired = React.useRef(false);

  React.useEffect(() => {
    cb.current = onExpire;
  });

  React.useEffect(() => {
    if (expired) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [expired, target]);

  React.useEffect(() => {
    if (expired && !fired.current) {
      fired.current = true;
      cb.current?.();
    }
    if (!expired) fired.current = false;
  }, [expired]);

  return remaining;
}

export interface CountdownProps {
  expiresAt: Date | string | number;
  onExpire?: () => void;
  /** Expired CTA "Buat pembayaran baru": callback or link. */
  onRenew?: () => void;
  renewHref?: string;
  /** Label before the timer. Default "Bayar dalam". */
  label?: string;
  /** inline = single line (e-wallet text) · block = boxed (pay page). */
  appearance?: "block" | "inline";
  className?: string;
}

/** HH:MM:SS countdown. < 5 min → warning colour; 0 → expired state + "Buat pembayaran baru". */
export function Countdown({ expiresAt, onExpire, onRenew, renewHref, label, appearance = "block", className }: CountdownProps) {
  const t = useTranslations("common");
  const remaining = useCountdown(expiresAt, onExpire);
  const expired = remaining <= 0;
  const warn = !expired && remaining < WARNING_THRESHOLD_MS;
  const time = formatRemaining(remaining);

  if (appearance === "inline") {
    return (
      <span className={cn("tabular font-semibold", warn ? "text-warning" : expired ? "text-error" : "text-ink", className)} suppressHydrationWarning>
        {expired ? t("countdown.expired") : time}
      </span>
    );
  }

  if (expired) {
    return (
      <div role="status" className={cn("flex flex-col items-center gap-3 rounded-md bg-error-bg px-4 py-4 text-center", className)}>
        <p className="flex items-center gap-2 text-sm font-semibold text-error">
          <TimerOff size={18} strokeWidth={1.5} aria-hidden />
          {t("countdown.expired")}
        </p>
        {renewHref ? (
          <Button asChild variant="secondary" size="sm">
            <a href={renewHref}>{t("countdown.renew")}</a>
          </Button>
        ) : onRenew ? (
          <Button variant="secondary" size="sm" onClick={onRenew}>
            {t("countdown.renew")}
          </Button>
        ) : null}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-4 rounded-md px-4 py-3",
        warn ? "bg-warning-bg text-warning" : "bg-surface-alt text-ink",
        className,
      )}
    >
      <span className="flex items-center gap-2 text-sm font-medium">
        <Clock size={18} strokeWidth={1.5} aria-hidden />
        {label ?? t("countdown.label")}
      </span>
      <span className="tabular font-mono text-xl font-semibold tracking-[0.04em]" role="timer" aria-live="off" suppressHydrationWarning>
        {time}
      </span>
      {warn ? <span className="sr-only" aria-live="polite">{t("countdown.warning")}</span> : null}
    </div>
  );
}
