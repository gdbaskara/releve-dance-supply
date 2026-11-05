"use client";

import { useTranslations } from "next-intl";
import { formatIDR } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { useToastOffset } from "@/components/ui/toast";
import { cn } from "@/lib/utils/cn";

export interface StickyPayBarProps {
  totalIdr: number;
  onPay?: () => void;
  /** Use type="submit" for the checkout form instead of onPay. */
  submit?: boolean;
  /** Associate with a form by id when the bar sits outside it. */
  form?: string;
  loading?: boolean;
  disabled?: boolean;
  label?: string;
  /** Hide on ≥ lg (default true — desktop uses the summary panel CTA). */
  mobileOnly?: boolean;
  className?: string;
}

/**
 * Mobile bottom bar: Total + primary "Bayar Sekarang". Fixed; add ~96px bottom padding to the page.
 * While mounted it lifts toasts above itself (useToastOffset(88)).
 */
export function StickyPayBar({ totalIdr, onPay, submit, form, loading, disabled, label, mobileOnly = true, className }: StickyPayBarProps) {
  const t = useTranslations("common");
  useToastOffset(mobileOnly ? 88 : 0);
  return (
    <div
      className={cn(
        "fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]",
        mobileOnly && "lg:hidden",
        className,
      )}
    >
      <div className="mx-auto flex max-w-xl items-center gap-4">
        <div className="flex flex-col">
          <span className="eyebrow text-ink-muted">{t("summary.total")}</span>
          <span className="tabular text-lg font-semibold">{formatIDR(totalIdr)}</span>
        </div>
        <Button
          type={submit ? "submit" : "button"}
          form={form}
          onClick={onPay}
          loading={loading}
          disabled={disabled}
          className="flex-1"
        >
          {label ?? t("payBar.payNow")}
        </Button>
      </div>
    </div>
  );
}
