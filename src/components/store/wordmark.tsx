import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils/cn";

export interface WordmarkProps {
  /** sm = header mobile · md = header desktop · lg = hero/showcase. */
  size?: "sm" | "md" | "lg";
  /** Hide the "DANCE SUPPLY" sub-label. */
  compact?: boolean;
  /** Inverse (white) for dark backgrounds. */
  inverse?: boolean;
  className?: string;
}

const main = { sm: "text-lg", md: "text-xl", lg: "text-4xl md:text-5xl" } as const;
const sub = { sm: "text-[9px]", md: "text-[10px]", lg: "text-xs" } as const;

/**
 * "RELEVÉ / DANCE SUPPLY" — Plus Jakarta Sans 600, UPPERCASE, tracking 0.24em (docs/07 §2).
 * Text wordmark (the store's own identity; never the Só Dança logo). SVG version: /public/brand/wordmark.svg.
 */
export function Wordmark({ size = "md", compact, inverse, className }: WordmarkProps) {
  const t = useTranslations("common");
  return (
    <span className={cn("inline-flex flex-col items-center leading-none", inverse ? "text-ink-inverse" : "text-ink", className)}>
      <span className={cn("font-semibold uppercase tracking-brand", main[size])} style={{ marginRight: "-0.24em" }}>
        {t("brand")}
      </span>
      {compact ? null : (
        <span
          className={cn("mt-1 font-semibold uppercase tracking-brand", sub[size], inverse ? "text-ink-inverse" : "text-ink-muted")}
          style={{ marginRight: "-0.24em" }}
        >
          {t("brandSub")}
        </span>
      )}
    </span>
  );
}
