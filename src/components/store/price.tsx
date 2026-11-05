import { useTranslations } from "next-intl";
import { formatIDR } from "@/lib/format";
import { cn } from "@/lib/utils/cn";

export interface PriceProps {
  /** Integer Rupiah (server-computed). */
  value: number;
  /** sm = card (14/16px) · md = 16px · lg = PDP (24px) · xl = order total (20px→24px). */
  size?: "sm" | "md" | "lg" | "xl";
  /** Prefix "Mulai" / "From" (listing of products whose variants differ in price). */
  from?: boolean;
  /** Struck-through compare price (rarely used; no flash-sale styling). */
  compareAt?: number;
  className?: string;
}

const sizeCls = {
  sm: "text-sm md:text-base",
  md: "text-base",
  lg: "text-2xl",
  xl: "text-xl md:text-2xl",
} as const;

/** Price in `ink`, tabular-nums, always via `formatIDR` → "Rp 675.000". */
export function Price({ value, size = "md", from, compareAt, className }: PriceProps) {
  const t = useTranslations("common");
  const formatted = formatIDR(value);
  return (
    <span className={cn("tabular inline-flex items-baseline gap-2 font-semibold text-ink", sizeCls[size], className)}>
      <span>{from ? t("price.from", { price: formatted }) : formatted}</span>
      {compareAt && compareAt > value ? (
        <s className="text-sm font-normal text-ink-muted">{formatIDR(compareAt)}</s>
      ) : null}
    </span>
  );
}
