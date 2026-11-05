import { useTranslations } from "next-intl";
import type { StockStatus } from "@/lib/contracts";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils/cn";

export interface StockBadgeProps {
  status: StockStatus;
  /** Units available (used for LOW → "Sisa {n}"). */
  available?: number;
  /** Pre-order lead weeks, e.g. "4-6" → "Pre-order · 4–6 minggu". */
  leadWeeks?: string | null;
  /** badge (default, cards/cart) · inline (PDP: 8px dot + text). */
  appearance?: "badge" | "inline";
  className?: string;
}

const variantFor: Record<StockStatus, "success" | "warning" | "neutral"> = {
  READY: "success",
  LOW: "warning",
  PREORDER: "warning",
  SOLD_OUT: "neutral",
};
const dotFor: Record<StockStatus, string> = {
  READY: "bg-success",
  LOW: "bg-warning",
  PREORDER: "bg-warning",
  SOLD_OUT: "bg-ink-subtle",
};

/** "-" in lead ranges → en dash for display ("4-6" → "4–6"). */
export function formatLead(lead: string | null | undefined): string {
  return (lead ?? "").replace(/-/g, "–");
}

/**
 * READY → success "Ready" · LOW → warning "Sisa {n}" · PREORDER → warning "Pre-order · {lead} minggu" ·
 * SOLD_OUT → neutral "Habis".
 */
export function StockBadge({ status, available = 0, leadWeeks, appearance = "badge", className }: StockBadgeProps) {
  const t = useTranslations("common");
  const text =
    status === "READY"
      ? t("stock.ready")
      : status === "LOW"
        ? t("stock.low", { n: available })
        : status === "PREORDER"
          ? leadWeeks
            ? t("stock.preorderWeeks", { lead: formatLead(leadWeeks) })
            : t("stock.preorder")
          : t("stock.soldout");
  if (appearance === "inline") {
    return (
      <span className={cn("inline-flex items-center gap-2 text-sm font-medium text-ink", className)}>
        <span aria-hidden className={cn("size-2 shrink-0 rounded-pill", dotFor[status])} />
        {text}
      </span>
    );
  }
  return (
    <Badge variant={variantFor[status]} className={className}>
      {text}
    </Badge>
  );
}
