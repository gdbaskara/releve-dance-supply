"use client";

import { useTranslations } from "next-intl";
import { FlaskConical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

export interface DemoPaymentControlsProps {
  /** Calls /api/demo/simulate-payment (WS-2) with PAID. */
  onSimulatePaid: () => void;
  /** … with EXPIRED. */
  onSimulateExpired: () => void;
  loading?: "paid" | "expired" | null;
  disabled?: boolean;
  className?: string;
}

/** DEMO_MODE only: dashed `info` box with "Simulasikan Bayar Berhasil" & "Simulasikan Kedaluwarsa". Render conditionally. */
export function DemoPaymentControls({ onSimulatePaid, onSimulateExpired, loading, disabled, className }: DemoPaymentControlsProps) {
  const t = useTranslations("common");
  return (
    <div className={cn("flex flex-col gap-3 rounded-md border border-dashed border-info bg-info-bg p-4", className)}>
      <p className="flex items-center gap-2 text-sm font-semibold text-info">
        <FlaskConical size={18} strokeWidth={1.5} aria-hidden />
        {t("demo.controlsTitle")}
      </p>
      <p className="-mt-1 text-xs text-ink-muted">{t("demo.controlsNote")}</p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button variant="secondary" size="sm" className="h-11 flex-1" onClick={onSimulatePaid} loading={loading === "paid"} disabled={disabled || !!loading}>
          {t("demo.simulatePaid")}
        </Button>
        <Button variant="secondary" size="sm" className="h-11 flex-1" onClick={onSimulateExpired} loading={loading === "expired"} disabled={disabled || !!loading}>
          {t("demo.simulateExpired")}
        </Button>
      </div>
    </div>
  );
}
