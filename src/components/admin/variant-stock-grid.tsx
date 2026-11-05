"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import type { VariantAdminView } from "@/lib/services/stock";
import { adjustStockAction } from "@/lib/actions/admin";
import { cn } from "@/lib/utils/cn";
import { Button } from "@/components/ui/button";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { useToast } from "@/components/ui/toast";

interface Group {
  key: string;
  label: string;
  sizes: string[];
  widths: (string | null)[];
  cells: Map<string, VariantAdminView>; // `${size}|${width}`
  skus: string[];
}

const cellKey = (size: string | null, width: string | null) => `${size ?? ""}|${width ?? ""}`;

function buildGroups(variants: VariantAdminView[], widthOrder: string[], fallbackLabel: string): Group[] {
  const groups = new Map<string, Group>();
  for (const v of variants) {
    const key = `${v.color ?? ""}|${v.shank ?? ""}`;
    let g = groups.get(key);
    if (!g) {
      g = { key, label: [v.color, v.shank].filter(Boolean).join(" · ") || fallbackLabel, sizes: [], widths: [], cells: new Map(), skus: [] };
      groups.set(key, g);
    }
    const size = v.size ?? "—";
    if (!g.sizes.includes(size)) g.sizes.push(size);
    if (!g.widths.includes(v.width)) g.widths.push(v.width);
    g.cells.set(cellKey(size, v.width), v);
    g.skus.push(v.sku);
  }
  for (const g of groups.values()) {
    g.widths.sort((a, b) => {
      const ia = a === null ? -1 : widthOrder.indexOf(a);
      const ib = b === null ? -1 : widthOrder.indexOf(b);
      return ia - ib;
    });
  }
  return [...groups.values()];
}


/**
 * ADM-03 VariantStockGrid: one grid per color (and shank), rows = size, columns = width.
 * Each cell edits on_hand; changed cells are highlighted; Save sends adjustStockAction per changed SKU.
 */
export function VariantStockGrid({ variants, widthOrder }: { variants: VariantAdminView[]; widthOrder: string[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const t = useTranslations("admin.stockGrid");
  const allVariantsLabel = t("allVariants");
  const groups = React.useMemo(() => buildGroups(variants, widthOrder, allVariantsLabel), [variants, widthOrder, allVariantsLabel]);
  const bySku = React.useMemo(() => new Map(variants.map((v) => [v.sku, v])), [variants]);
  const [groupKey, setGroupKey] = React.useState(groups[0]?.key ?? "");
  const [edits, setEdits] = React.useState<Record<string, string>>({});
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [saving, setSaving] = React.useState(false);

  const group = groups.find((g) => g.key === groupKey) ?? groups[0];

  // An edit equal to the saved value is not a change.
  const changed = Object.entries(edits).filter(([sku, val]) => {
    const v = bySku.get(sku);
    return v && val.trim() !== "" && Number(val) !== v.onHand;
  });
  const changedSet = new Set(changed.map(([s]) => s));
  const changedPerGroup = (g: Group) => g.skus.filter((s) => changedSet.has(s)).length;

  const localError = (v: VariantAdminView, raw: string | undefined): string | null => {
    if (raw === undefined || raw.trim() === "") return null;
    const n = Number(raw);
    if (!Number.isInteger(n) || n < 0) return t("errors.INVALID_QTY");
    if (n < v.reserved) return t("errors.BELOW_RESERVED", { count: v.reserved });
    return null;
  };

  const onSave = async () => {
    const todo = changed.map(([sku, val]) => ({ sku, n: Number(val) }));
    const pre: Record<string, string> = {};
    for (const { sku } of todo) {
      const e = localError(bySku.get(sku)!, edits[sku]);
      if (e) pre[sku] = e;
    }
    if (Object.keys(pre).length) {
      setErrors(pre);
      toast({ variant: "error", title: t("toastCheckCells") });
      return;
    }
    setSaving(true);
    const nextErrors: Record<string, string> = {};
    const saved: string[] = [];
    let notified = 0;
    for (const { sku, n } of todo) {
      try {
        const res = await adjustStockAction(sku, n);
        if (res.ok) {
          saved.push(sku);
          notified += res.notified;
        } else {
          nextErrors[sku] = t(`errors.${res.error}`, { count: ("reserved" in res ? res.reserved : undefined) ?? 0 });
        }
      } catch {
        nextErrors[sku] = t("errors.saveFailed");
      }
    }
    setErrors(nextErrors);
    setEdits((prev) => {
      const copy = { ...prev };
      for (const s of saved) delete copy[s];
      return copy;
    });
    setSaving(false);
    if (saved.length) {
      toast({
        variant: "success",
        title: t("toastSaved", { count: saved.length }),
        description: notified ? t("toastNotified", { count: notified }) : t("toastLogged"),
      });
    }
    if (Object.keys(nextErrors).length) toast({ variant: "error", title: t("toastFailed", { count: Object.keys(nextErrors).length }) });
    router.refresh();
  };

  if (!group) return <p className="text-sm text-ink-muted">{t("noVariants")}</p>;

  const singleColumn = group.widths.length === 1 && group.widths[0] === null;

  return (
    <div className="flex flex-col gap-4">
      {groups.length > 1 ? (
        <SegmentedControl
          label={t("colorLabel")}
          size="sm"
          value={group.key}
          onChange={setGroupKey}
          options={groups.map((g) => {
            const n = changedPerGroup(g);
            return { value: g.key, label: g.label, marker: n ? String(n) : undefined };
          })}
        />
      ) : null}

      <div className="overflow-x-auto rounded-md border border-border">
        <table className="border-collapse text-sm" data-testid="stock-grid" data-group={group.label}>
          <caption className="sr-only">{t("caption", { group: group.label })}</caption>
          <thead>
            <tr className="bg-surface-alt">
              <th scope="col" className="sticky left-0 z-10 bg-surface-alt px-3 py-2 text-left text-xs font-semibold text-ink-muted">
                {t("size")}
              </th>
              {group.widths.map((w) => (
                <th key={w ?? "_"} scope="col" className="px-2 py-2 text-left text-xs font-semibold text-ink-muted">
                  {w ?? (singleColumn ? t("stock") : "—")}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {group.sizes.map((size) => (
              <tr key={size} className="border-t border-border">
                <th scope="row" className="sticky left-0 z-10 min-w-20 bg-surface px-3 py-1.5 text-left text-sm font-medium leading-5 text-ink md:whitespace-nowrap">
                  {size}
                </th>
                {group.widths.map((w) => {
                  const v = group.cells.get(cellKey(size, w));
                  if (!v) return <td key={w ?? "_"} className="px-2 py-1.5 text-ink-subtle">—</td>;
                  const raw = edits[v.sku];
                  const isChanged = changedSet.has(v.sku);
                  const err = errors[v.sku] ?? (isChanged ? localError(v, raw) : null);
                  return (
                    <td key={w ?? "_"} className={cn("px-2 py-1.5 align-top", isChanged && "bg-warning-bg")}>
                      <input
                        type="number"
                        inputMode="numeric"
                        min={v.reserved}
                        step={1}
                        value={raw ?? String(v.onHand)}
                        onChange={(e) => {
                          const val = e.target.value;
                          setEdits((p) => ({ ...p, [v.sku]: val }));
                          setErrors((p) => {
                            if (!p[v.sku]) return p;
                            const c = { ...p };
                            delete c[v.sku];
                            return c;
                          });
                        }}
                        aria-label={t("cellLabel", { label: v.label })}
                        aria-invalid={err ? true : undefined}
                        data-sku={v.sku}
                        className={cn(
                          "tabular h-9 w-16 rounded-sm md:w-20 border bg-surface px-2 text-base text-ink",
                          "focus:border-ink focus:shadow-[inset_0_0_0_1px_var(--color-ink)] focus:outline-none",
                          isChanged ? "border-warning font-semibold" : "border-border-strong",
                          err && "border-error",
                        )}
                      />
                      <div className="mt-0.5 whitespace-nowrap text-[11px] leading-4 text-ink-muted">
                        {v.reserved ? t("reserved", { count: v.reserved }) : ""}
                        <span className={cn(v.available <= 0 ? (v.preorderEnabled ? "text-warning" : "text-error") : v.available <= 3 ? "text-warning" : "")}>
                          {v.available <= 0 ? (v.preorderEnabled ? t("preorderShort") : t("soldOut")) : t("left", { count: v.available })}
                        </span>
                      </div>
                      {err ? (
                        <div role="alert" className="mt-0.5 max-w-24 text-[11px] leading-4 text-error">
                          {err}
                        </div>
                      ) : null}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="sticky bottom-0 z-20 -mx-4 flex items-center gap-3 border-t border-border bg-surface px-4 py-3 md:mx-0 md:rounded-md md:border">
        <p className="flex-1 text-sm text-ink-muted" aria-live="polite">
          {changed.length ? (
            t.rich("changes", {
              count: changed.length,
              strong: (chunks) => <strong className="font-semibold text-ink">{chunks}</strong>,
              desktop: (chunks) => <span className="hidden md:inline">{chunks}</span>,
            })
          ) : (
            <span>
              <span className="md:hidden">{t("hintMobile")}</span>
              <span className="hidden md:inline">{t("hintDesktop")}</span>
            </span>
          )}
        </p>
        <Button
          size="sm"
          variant="ghost"
          disabled={!changed.length || saving}
          onClick={() => {
            setEdits({});
            setErrors({});
          }}
        >
          {t("cancel")}
        </Button>
        <Button size="sm" onClick={onSave} disabled={!changed.length} loading={saving}>
          {t("save")}
        </Button>
      </div>
    </div>
  );
}
