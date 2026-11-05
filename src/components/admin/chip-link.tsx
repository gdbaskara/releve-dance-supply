import Link from "next/link";
import * as React from "react";
import { cn } from "@/lib/utils/cn";

/** Link styled like the UI `Chip` (filter chips driven by URL search params). */
export function ChipLink({ href, selected, count, children }: { href: string; selected?: boolean; count?: number; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={selected ? "page" : undefined}
      scroll={false}
      className={cn(
        "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-pill border px-4 text-sm font-medium transition-colors duration-150",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus",
        selected ? "border-ink bg-ink text-ink-inverse" : "border-border-strong bg-surface text-ink hover:bg-surface-alt",
      )}
    >
      {children}
      {count !== undefined ? <span className={cn("tabular text-xs", selected ? "text-ink-inverse" : "text-ink-muted")}>{count}</span> : null}
    </Link>
  );
}

/** Horizontally scrollable chip row (mobile) that wraps on desktop. */
export function ChipRow({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <nav aria-label={label} className="-mx-4 overflow-x-auto px-4 md:mx-0 md:px-0">
      <div className="flex gap-2 md:flex-wrap">{children}</div>
    </nav>
  );
}
