import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils/cn";

/** Prev / next pagination driven by a `page` search param. */
export function Pagination({ page, pageSize, total, hrefFor }: { page: number; pageSize: number; total: number; hrefFor: (page: number) => string }) {
  const t = useTranslations("admin.pagination");
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;
  const btn = "inline-flex size-9 items-center justify-center rounded-sm border border-border-strong bg-surface text-ink hover:bg-surface-alt";
  return (
    <nav aria-label={t("label")} className="flex items-center justify-between gap-3 border-t border-border px-4 py-3 text-sm text-ink-muted">
      <span className="tabular">
        {t("range", { from: (page - 1) * pageSize + 1, to: Math.min(page * pageSize, total), total })}
      </span>
      <div className="flex items-center gap-2">
        {page > 1 ? (
          <Link href={hrefFor(page - 1)} className={btn} aria-label={t("prev")}>
            <ChevronLeft size={18} strokeWidth={1.5} aria-hidden />
          </Link>
        ) : (
          <span className={cn(btn, "opacity-40")} aria-hidden>
            <ChevronLeft size={18} strokeWidth={1.5} />
          </span>
        )}
        <span className="tabular text-ink">
          {page} / {pages}
        </span>
        {page < pages ? (
          <Link href={hrefFor(page + 1)} className={btn} aria-label={t("next")}>
            <ChevronRight size={18} strokeWidth={1.5} aria-hidden />
          </Link>
        ) : (
          <span className={cn(btn, "opacity-40")} aria-hidden>
            <ChevronRight size={18} strokeWidth={1.5} />
          </span>
        )}
      </div>
    </nav>
  );
}
