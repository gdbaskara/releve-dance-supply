import { useTranslations } from "next-intl";
import { Info } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export interface DemoBannerProps {
  /** Override text; default t("common.demoBanner"). */
  message?: string;
  className?: string;
}

/** 32px `info-bg` bar shown when DEMO_MODE is on: "Mode demo — pembayaran & pengiriman disimulasikan." */
export function DemoBanner({ message, className }: DemoBannerProps) {
  const t = useTranslations("common");
  return (
    <div role="note" className={cn("flex min-h-8 items-center justify-center gap-2 bg-info-bg px-4 py-1 text-center text-xs font-medium text-info", className)}>
      <Info size={14} strokeWidth={1.5} aria-hidden className="shrink-0" />
      <span>{message ?? t("demoBanner")}</span>
    </div>
  );
}
