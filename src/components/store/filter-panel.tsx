"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { SlidersHorizontal } from "lucide-react";
import { Accordion } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Chip } from "@/components/ui/chip";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { cn } from "@/lib/utils/cn";
import { ColorSwatch } from "./color-swatch";

export interface FilterFacetOption {
  value: string;
  /** Display label (defaults to value). */
  label?: string;
  count: number;
}

export interface FilterFacet {
  /** Query key, e.g. "size", "width", "color", "availability". */
  key: string;
  /** Translated facet title. */
  label: string;
  /** chips (sizes, widths) · checkbox (discipline, availability) · swatch (colors). */
  kind: "chips" | "checkbox" | "swatch";
  options: FilterFacetOption[];
}

export type FilterSelection = Record<string, string[]>;

export interface FilterPanelProps {
  facets: FilterFacet[];
  selected: FilterSelection;
  /** Called with the full next selection. */
  onChange: (next: FilterSelection) => void;
  onClear?: () => void;
  /** Facet keys open initially. Default: all. */
  defaultOpen?: string[];
  className?: string;
}

function toggle(sel: FilterSelection, key: string, value: string): FilterSelection {
  const cur = sel[key] ?? [];
  const next = cur.includes(value) ? cur.filter((v) => v !== value) : [...cur, value];
  return { ...sel, [key]: next };
}

/** Facets as accordion sections. Use directly as the desktop sidebar (240px) or inside `FilterSheet`. */
export function FilterPanel({ facets, selected, onChange, onClear, defaultOpen, className }: FilterPanelProps) {
  const t = useTranslations("common");
  const total = Object.values(selected).reduce((n, v) => n + v.length, 0);
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex min-h-11 items-center justify-between">
        <span className="eyebrow text-ink">{t("filter.title")}</span>
        {onClear && total > 0 ? (
          <button type="button" onClick={onClear} className="min-h-11 text-sm text-ink underline underline-offset-[3px] hover:text-accent-strong">
            {t("filter.clear")}
          </button>
        ) : null}
      </div>
      <Accordion
        type="multiple"
        defaultOpen={defaultOpen ?? facets.map((f) => f.key)}
        items={facets.map((f) => {
          const sel = selected[f.key] ?? [];
          return {
            value: f.key,
            title: f.label,
            meta: sel.length ? t("filter.selectedCount", { n: sel.length }) : undefined,
            content:
              f.kind === "chips" ? (
                <div className="flex flex-wrap gap-2">
                  {f.options.map((o) => (
                    <Chip
                      key={o.value}
                      selected={sel.includes(o.value)}
                      disabled={o.count === 0 && !sel.includes(o.value)}
                      onClick={() => onChange(toggle(selected, f.key, o.value))}
                    >
                      {o.label ?? o.value}
                    </Chip>
                  ))}
                </div>
              ) : f.kind === "swatch" ? (
                <div className="grid grid-cols-1 gap-0">
                  {f.options.map((o) => (
                    <Checkbox
                      key={o.value}
                      checked={sel.includes(o.value)}
                      onCheckedChange={() => onChange(toggle(selected, f.key, o.value))}
                      disabled={o.count === 0 && !sel.includes(o.value)}
                      label={
                        <span className="inline-flex items-center gap-2">
                          <ColorSwatch color={o.value} size={18} />
                          {o.label ?? o.value}
                        </span>
                      }
                      aside={<span className="font-normal text-ink-muted">{o.count}</span>}
                    />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col">
                  {f.options.map((o) => (
                    <Checkbox
                      key={o.value}
                      checked={sel.includes(o.value)}
                      onCheckedChange={() => onChange(toggle(selected, f.key, o.value))}
                      disabled={o.count === 0 && !sel.includes(o.value)}
                      label={o.label ?? o.value}
                      aside={<span className="font-normal text-ink-muted">{o.count}</span>}
                    />
                  ))}
                </div>
              ),
          };
        })}
      />
    </div>
  );
}

export interface FilterSheetProps extends FilterPanelProps {
  /** Number of products matching the current selection ("Tampilkan {n} produk"). */
  resultCount: number;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Custom trigger; default outlined "Filter (n)" button. */
  trigger?: React.ReactElement;
}

/** Mobile: "Filter" button → bottom sheet with FilterPanel + sticky "Tampilkan {n} produk". */
export function FilterSheet({ resultCount, open, onOpenChange, trigger, ...panel }: FilterSheetProps) {
  const t = useTranslations("common");
  const [innerOpen, setInnerOpen] = React.useState(false);
  const isOpen = open ?? innerOpen;
  const setOpen = onOpenChange ?? setInnerOpen;
  const total = Object.values(panel.selected).reduce((n, v) => n + v.length, 0);
  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="secondary" size="sm" leadingIcon={<SlidersHorizontal size={16} strokeWidth={1.5} aria-hidden />} className="h-11">
            {t("filter.title")}
            {total ? ` (${total})` : ""}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent
        variant="sheet"
        title={t("filter.title")}
        footer={
          <div className="flex gap-3">
            {panel.onClear ? (
              <Button variant="secondary" onClick={panel.onClear} disabled={total === 0}>
                {t("filter.clear")}
              </Button>
            ) : null}
            <Button fullWidth onClick={() => setOpen(false)} className="flex-1">
              {t("filter.show", { n: resultCount })}
            </Button>
          </div>
        }
      >
        <FilterPanel {...panel} onClear={undefined} className="-mt-2" />
      </DialogContent>
    </Dialog>
  );
}
