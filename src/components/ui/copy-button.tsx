"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useToast } from "./toast";

export interface CopyButtonProps {
  /** Text placed on the clipboard (e.g. VA digits without spaces). */
  value: string;
  /** Visible label. Default t("common.copy"). */
  label?: string;
  /** Accessible label when it differs from the visible one, e.g. "Salin nomor VA". */
  ariaLabel?: string;
  /** Toast title after copying. Default t("common.copied"). Pass `false` to skip the toast. */
  toastTitle?: string | false;
  onCopied?: () => void;
  className?: string;
  /** "inline" = text button (default) · "outline" = bordered 44px button. */
  appearance?: "inline" | "outline";
}

/** Copies `value`, shows "Disalin ✓" for 2s and a toast (when a ToastProvider is mounted). */
export function CopyButton({ value, label, ariaLabel, toastTitle, onCopied, className, appearance = "inline" }: CopyButtonProps) {
  const t = useTranslations("common");
  const { toast } = useToast();
  const [copied, setCopied] = React.useState(false);
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const doCopy = async () => {
    try {
      await navigator.clipboard?.writeText(value);
    } catch {
      /* clipboard can be blocked (insecure origin) — still show feedback; value is visible on screen */
    }
    setCopied(true);
    if (toastTitle !== false) toast({ title: toastTitle ?? t("copied"), variant: "success", duration: 2000 });
    onCopied?.();
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      type="button"
      onClick={doCopy}
      aria-label={ariaLabel}
      className={cn(
        "inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-sm text-sm font-semibold uppercase tracking-button text-ink",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus",
        appearance === "inline" ? "px-2 hover:bg-surface-alt" : "border border-ink bg-surface px-4 hover:bg-surface-alt",
        copied && "text-success",
        className,
      )}
    >
      {copied ? <Check size={16} strokeWidth={2} aria-hidden /> : <Copy size={16} strokeWidth={1.5} aria-hidden />}
      <span aria-live="polite">{copied ? t("copied") : (label ?? t("copy"))}</span>
    </button>
  );
}
