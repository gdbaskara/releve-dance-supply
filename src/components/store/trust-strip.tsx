import { useTranslations } from "next-intl";
import { BadgeCheck, MessageCircle, QrCode, Truck } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export type TrustItemKey = "original" | "jakarta" | "payment" | "consult";

export interface TrustStripProps {
  /** Which items to show, in order. Default all four. PDP mini: ["jakarta", "payment"]. */
  items?: TrustItemKey[];
  /** full = section band (surface-alt, 4 columns desktop) · mini = compact inline list (PDP). */
  variant?: "full" | "mini";
  className?: string;
}

const ICON = { original: BadgeCheck, jakarta: Truck, payment: QrCode, consult: MessageCircle } as const;

/** Original Só Dança · Dikirim dari Jakarta · QRIS/VA/e-wallet · Konsultasi ukuran via WA. */
export function TrustStrip({ items = ["original", "jakarta", "payment", "consult"], variant = "full", className }: TrustStripProps) {
  const t = useTranslations("common");
  if (variant === "mini") {
    return (
      <ul className={cn("flex flex-col gap-2 text-sm text-ink-muted", className)}>
        {items.map((k) => {
          const Icon = ICON[k];
          return (
            <li key={k} className="flex items-center gap-2">
              <Icon size={18} strokeWidth={1.5} aria-hidden className="text-ink" />
              {t(`trust.${k}`)}
            </li>
          );
        })}
      </ul>
    );
  }
  return (
    <ul className={cn("grid grid-cols-2 gap-x-4 gap-y-6 bg-surface-alt px-4 py-8 md:grid-cols-4 md:px-8", className)}>
      {items.map((k) => {
        const Icon = ICON[k];
        return (
          <li key={k} className="flex flex-col items-center gap-3 text-center">
            <Icon size={24} strokeWidth={1.5} aria-hidden className="text-ink" />
            <span className="eyebrow max-w-[18ch] text-ink">{t(`trust.${k}`)}</span>
          </li>
        );
      })}
    </ul>
  );
}
