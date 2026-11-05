"use client";

import { useTranslations } from "next-intl";
import { Button } from "./button";

export interface LoadMoreProps {
  shown: number;
  total: number;
  onLoadMore?: () => void;
  /** Alternative to onLoadMore: progressive-enhancement link (e.g. "?page=2"). */
  href?: string;
  loading?: boolean;
  label?: string;
}

/** "Menampilkan 24 dari 96 produk" + "Muat lebih banyak" (24/page). Hidden when everything is shown. */
export function LoadMore({ shown, total, onLoadMore, href, loading, label }: LoadMoreProps) {
  const t = useTranslations("common");
  const pct = total > 0 ? Math.min(100, Math.round((shown / total) * 100)) : 100;
  return (
    <div className="flex flex-col items-center gap-4 py-8">
      <p className="tabular text-sm text-ink-muted">{t("loadMore.shown", { shown, total })}</p>
      <div className="h-0.5 w-40 bg-border" aria-hidden>
        <div className="h-full bg-ink" style={{ width: `${pct}%` }} />
      </div>
      {shown < total ? (
        href ? (
          <Button asChild variant="secondary">
            <a href={href}>{label ?? t("loadMore.label")}</a>
          </Button>
        ) : (
          <Button variant="secondary" onClick={onLoadMore} loading={loading}>
            {label ?? t("loadMore.label")}
          </Button>
        )
      ) : null}
    </div>
  );
}
