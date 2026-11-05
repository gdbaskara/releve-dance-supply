import * as React from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export interface BreadcrumbItem {
  label: string;
  /** Omit for the current page (last item). */
  href?: string;
}

export interface BreadcrumbProps {
  items: BreadcrumbItem[];
  /** aria-label of the nav landmark (e.g. t("common.breadcrumb")). */
  label: string;
  /** Link component for internal routes (e.g. next-intl `Link`). Default `"a"`. */
  linkAs?: React.ElementType;
  className?: string;
}

/** PDP & listing (desktop). Last item gets aria-current="page". */
export function Breadcrumb({ items, label, linkAs: LinkComp = "a", className }: BreadcrumbProps) {
  return (
    <nav aria-label={label} className={className}>
      <ol className="flex flex-wrap items-center gap-1 text-xs text-ink-muted">
        {items.map((it, i) => {
          const last = i === items.length - 1;
          return (
            <li key={`${it.label}-${i}`} className="flex items-center gap-1">
              {it.href && !last ? (
                <LinkComp
                  href={it.href}
                  className="eyebrow inline-flex min-h-11 items-center rounded-sm text-ink-muted hover:text-ink hover:underline focus-visible:outline-2 focus-visible:outline-focus"
                >
                  {it.label}
                </LinkComp>
              ) : (
                <span aria-current={last ? "page" : undefined} className={cn("eyebrow inline-flex min-h-11 items-center", last && "text-ink")}>
                  {it.label}
                </span>
              )}
              {!last ? <ChevronRight size={14} strokeWidth={1.5} aria-hidden /> : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
