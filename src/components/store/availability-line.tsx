import { useTranslations } from "next-intl";
import { CircleCheck, Clock, Ruler, TriangleExclamationPoint, CircleX } from "lucide-react";
import type { StockStatus } from "@/lib/contracts";
import { cn } from "@/lib/utils/cn";
import { formatLead } from "./stock-badge";

export interface AvailabilityLineProps {
  /** null = no complete selection yet ("Pilih ukuran…"). */
  status: StockStatus | null;
  available?: number;
  leadWeeks?: string | null;
  className?: string;
}

const iconFor = { READY: CircleCheck, LOW: TriangleExclamationPoint, PREORDER: Clock, SOLD_OUT: CircleX } as const;
const toneFor = { READY: "text-success", LOW: "text-warning", PREORDER: "text-warning", SOLD_OUT: "text-ink-muted" } as const;

/** Under VariantPicker: icon + honest availability text for the selected variant (aria-live polite). */
export function AvailabilityLine({ status, available = 0, leadWeeks, className }: AvailabilityLineProps) {
  const t = useTranslations("common");
  const Icon = status ? iconFor[status] : Ruler;
  const text =
    status === "READY"
      ? t("availability.ready")
      : status === "LOW"
        ? t("availability.low", { n: available })
        : status === "PREORDER"
          ? t("availability.preorder", { lead: formatLead(leadWeeks) || "4–6" })
          : status === "SOLD_OUT"
            ? t("availability.soldout")
            : t("availability.select");
  return (
    <p aria-live="polite" className={cn("flex items-start gap-2 text-sm text-ink", className)}>
      <Icon size={18} strokeWidth={1.5} aria-hidden className={cn("mt-px shrink-0", status ? toneFor[status] : "text-ink-muted")} />
      <span className={cn(!status && "text-ink-muted")}>{text}</span>
    </p>
  );
}
