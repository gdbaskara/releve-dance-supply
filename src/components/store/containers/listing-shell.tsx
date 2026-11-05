"use client";
/**
 * Listing layout & URL-driven controls (CAT-03/04): desktop sidebar FilterPanel, mobile FilterSheet,
 * sort select, active-filter chips, "Muat lebih banyak". All state lives in the query string
 * (comma-separated values) so a filtered listing can be shared.
 */
import * as React from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { X } from "lucide-react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { FilterPanel, FilterSheet, type FilterFacet, type FilterSelection } from "@/components/store/filter-panel";
import { Select } from "@/components/ui/select";
import { LoadMore } from "@/components/ui/load-more";
import { cn } from "@/lib/utils/cn";
import { FILTER_KEYS } from "./format";


export interface ListingShellProps {
  facets: FilterFacet[];
  selected: FilterSelection;
  total: number;
  shown: number;
  sort: string;
  /** Grid (server-rendered) or empty state. */
  children: React.ReactNode;
}

function useQueryNav() {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [pending, start] = React.useTransition();
  const go = React.useCallback(
    (mutate: (q: URLSearchParams) => void) => {
      const q = new URLSearchParams(sp.toString());
      mutate(q);
      const qs = q.toString();
      start(() => router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false }));
    },
    [router, pathname, sp],
  );
  return { go, pending };
}

export function ListingShell({ facets, selected, total, shown, sort, children }: ListingShellProps) {
  const t = useTranslations("catalog.listing");
  const tc = useTranslations("common");
  const { go, pending } = useQueryNav();
  const [sheetOpen, setSheetOpen] = React.useState(false);

  const applySelection = (next: FilterSelection) =>
    go((q) => {
      for (const k of FILTER_KEYS) q.delete(k);
      for (const [k, vals] of Object.entries(next)) if (vals.length) q.set(k, vals.join(","));
      q.delete("page");
    });
  const clear = () => applySelection({});
  const setSort = (v: string) =>
    go((q) => {
      if (v === "newest") q.delete("sort");
      else q.set("sort", v);
      q.delete("page");
    });
  const loadMore = () =>
    go((q) => {
      const page = Math.floor(shown / 24) + 1;
      q.set("page", String(page));
    });

  const active = facets.flatMap((f) =>
    (selected[f.key] ?? []).map((v) => ({ key: f.key, value: v, label: f.options.find((o) => o.value === v)?.label ?? v })),
  );
  const hasFacets = facets.length > 0;

  const sortSelect = (
    <Select
      aria-label={t("sort")}
      value={sort}
      onChange={(e) => setSort(e.target.value)}
      wrapperClassName="w-44 lg:w-56"
      className="h-11"
      options={(["newest", "price_asc", "price_desc"] as const).map((s) => ({ value: s, label: t(`sortOptions.${s}`) }))}
    />
  );

  return (
    <div className={cn("flex gap-8", hasFacets && "lg:grid lg:grid-cols-[240px_1fr]")}>
      {hasFacets ? (
        <aside className="hidden lg:block" aria-label={tc("filter.title")}>
          <div className="sticky top-[calc(var(--header-h)+1rem)] max-h-[calc(100dvh-var(--header-h)-2rem)] overflow-y-auto pr-2">
            <FilterPanel facets={facets} selected={selected} onChange={applySelection} onClear={clear} />
          </div>
        </aside>
      ) : null}
      <div className="flex min-w-0 flex-1 flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-y border-border py-2">
          <p className="tabular text-sm text-ink-muted" aria-live="polite">
            {t("count", { n: total })}
          </p>
          <div className="flex items-center gap-2">
            {hasFacets ? (
              <div className="lg:hidden">
                <FilterSheet
                  facets={facets}
                  selected={selected}
                  onChange={applySelection}
                  onClear={clear}
                  resultCount={total}
                  open={sheetOpen}
                  onOpenChange={setSheetOpen}
                />
              </div>
            ) : null}
            {sortSelect}
          </div>
        </div>
        {active.length ? (
          <ul aria-label={t("activeFilters")} className="flex flex-wrap items-center gap-2">
            {active.map((a) => (
              <li key={`${a.key}-${a.value}`}>
                <button
                  type="button"
                  onClick={() =>
                    applySelection({ ...selected, [a.key]: (selected[a.key] ?? []).filter((v) => v !== a.value) })
                  }
                  aria-label={t("removeFilter", { label: a.label })}
                  className="inline-flex h-9 items-center gap-1.5 rounded-pill border border-border-strong px-3 text-sm text-ink hover:border-ink focus-visible:outline-2 focus-visible:outline-focus"
                >
                  {a.label}
                  <X size={14} strokeWidth={1.5} aria-hidden />
                </button>
              </li>
            ))}
            <li>
              <button type="button" onClick={clear} className="inline-flex min-h-9 items-center px-2 text-sm text-ink underline underline-offset-[3px]">
                {t("reset")}
              </button>
            </li>
          </ul>
        ) : null}
        <div aria-busy={pending || undefined} className={cn("transition-opacity", pending && "opacity-60")}>
          {children}
        </div>
        {total > 0 ? <LoadMore shown={shown} total={total} onLoadMore={loadMore} loading={pending} /> : null}
      </div>
    </div>
  );
}
