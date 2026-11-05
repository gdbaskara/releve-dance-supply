"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Notice } from "@/components/ui/notice";
import { Tabs } from "@/components/ui/segmented-control";
import { cn } from "@/lib/utils/cn";
import { WhatsAppButton } from "./whatsapp-button";
import {
  APPAREL_ROWS,
  CONTEMPORARY_ROWS,
  TIGHTS_ROWS,
  shoeRows,
  sizeKey,
  widthRows,
  type ShoeGroup,
  type SizeGuideCategory,
  type WidthKey,
} from "./size-guide-data";

export type { SizeGuideCategory } from "./size-guide-data";

/* Tables are APPROXIMATE (Q-06) — see size-guide-data.ts. */

const th = "eyebrow border-b border-border-strong px-3 py-3 text-left text-ink-muted";
const td = "tabular border-b border-border px-3 py-2.5 text-sm text-ink";
const groupTh = "bg-surface-alt px-3 py-2 text-left text-xs font-semibold text-ink";

/** Row highlight for the size picked on the PDP. */
function rowClass(active: boolean) {
  return cn(active && "bg-surface-alt [&>*]:font-semibold");
}

function YourSize({ show }: { show: boolean }) {
  const t = useTranslations("common");
  if (!show) return null;
  return <span className="ml-2 rounded-pill bg-ink px-2 py-0.5 text-xs font-medium text-ink-inverse">{t("sizeGuide.yourSize")}</span>;
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h4 className="eyebrow text-ink">{children}</h4>;
}

function ShoeTable({ category, highlight }: { category: Exclude<SizeGuideCategory, "dancewear">; highlight: string | null }) {
  const t = useTranslations("common");
  const rows = shoeRows(category);
  const groups = (["toddler", "child", "adult"] as ShoeGroup[]).filter((g) => rows.some((r) => r.group === g));
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[280px] border-collapse">
        <caption className="sr-only">{t("sizeGuide.shoeCaption")}</caption>
        <thead>
          <tr>
            <th scope="col" className={th}>{t("sizeGuide.usSize")}</th>
            <th scope="col" className={th}>{t("sizeGuide.footLength")}</th>
            <th scope="col" className={th}>{t("sizeGuide.eu")}</th>
          </tr>
        </thead>
        {groups.map((g) => (
          <tbody key={g}>
            <tr>
              <th colSpan={3} scope="colgroup" className={groupTh}>
                {t(`sizeGroups.${g}`)}
              </th>
            </tr>
            {rows
              .filter((r) => r.group === g)
              .map((r) => {
                const active = r.key === highlight;
                return (
                  <tr key={r.key} className={rowClass(active)} aria-current={active ? "true" : undefined}>
                    <th scope="row" className={`${td} font-semibold`}>
                      {r.label}
                      <YourSize show={active} />
                    </th>
                    <td className={td}>{r.cm.toFixed(1)}</td>
                    <td className={`${td} text-ink-muted`}>{r.eu}</td>
                  </tr>
                );
              })}
          </tbody>
        ))}
      </table>
    </div>
  );
}

interface SimpleTableProps {
  caption: string;
  cols: string[];
  rows: { key: string; cells: string[] }[];
  highlight: string | null;
  minWidth?: string;
}

function SimpleTable({ caption, cols, rows, highlight, minWidth = "min-w-[280px]" }: SimpleTableProps) {
  return (
    <div className="-mx-1 overflow-x-auto px-1">
      <table className={cn("w-full border-collapse", minWidth)}>
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr>
            {cols.map((c) => (
              <th key={c} scope="col" className={th}>
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(({ key, cells: [first, ...rest] }) => {
            const active = key === highlight;
            return (
              <tr key={key} className={rowClass(active)} aria-current={active ? "true" : undefined}>
                <th scope="row" className={`${td} font-semibold`}>
                  {first}
                  <YourSize show={active} />
                </th>
                {rest.map((v, i) => (
                  <td key={i} className={td}>
                    {v}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function WidthTable({ widths }: { widths: WidthKey[] }) {
  const t = useTranslations("common");
  return (
    <section className="flex flex-col gap-2">
      <SectionTitle>{t("sizeGuide.widthTitle")}</SectionTitle>
      <p className="text-sm text-ink-muted">{t("sizeGuide.widthIntro")}</p>
      <SimpleTable
        caption={t("sizeGuide.widthCaption")}
        cols={[t("sizeGuide.widthCols.width"), t("sizeGuide.widthCols.fit")]}
        rows={widths.map((w) => ({ key: w, cells: [w, t(`sizeGuide.widths.${w}`)] }))}
        highlight={null}
      />
    </section>
  );
}

function ShoeTab({ category, highlight }: { category: Exclude<SizeGuideCategory, "dancewear">; highlight: string | null }) {
  const t = useTranslations("common");
  return (
    <>
      <section className="flex flex-col gap-2">
        <SectionTitle>{t("sizeGuide.shoeTitle")}</SectionTitle>
        <ShoeTable category={category} highlight={highlight} />
      </section>
      {category === "balletJazz" ? (
        <section className="flex flex-col gap-2">
          <SectionTitle>{t("sizeGuide.contemporaryTitle")}</SectionTitle>
          <SimpleTable
            caption={t("sizeGuide.contemporaryCaption")}
            cols={[t("sizeGuide.cols.size"), t("sizeGuide.cols.us"), t("sizeGuide.footLength")]}
            rows={CONTEMPORARY_ROWS.map((r) => ({ key: r.size, cells: [r.size, r.us, r.cm] }))}
            highlight={highlight}
          />
        </section>
      ) : null}
      <WidthTable widths={widthRows(category)} />
    </>
  );
}

function DancewearTab({ highlight }: { highlight: string | null }) {
  const t = useTranslations("common");
  const col = (k: "size" | "height" | "chest" | "waist" | "hip" | "weight") => t(`sizeGuide.cols.${k}`);
  return (
    <>
      <section className="flex flex-col gap-2">
        <SectionTitle>{t("sizeGuide.apparelTitle")}</SectionTitle>
        <SimpleTable
          caption={t("sizeGuide.dancewearCaption")}
          cols={[col("size"), col("height"), col("chest"), col("waist"), col("hip")]}
          rows={APPAREL_ROWS.map((r) => ({ key: r.size, cells: [r.size, r.height, r.chest, r.waist, r.hip] }))}
          highlight={highlight}
          minWidth="min-w-[420px]"
        />
      </section>
      <section className="flex flex-col gap-2">
        <SectionTitle>{t("sizeGuide.tightsTitle")}</SectionTitle>
        <SimpleTable
          caption={t("sizeGuide.tightsCaption")}
          cols={[col("size"), col("height"), col("weight")]}
          rows={TIGHTS_ROWS.map((r) => ({ key: r.size, cells: [r.size, r.height, r.weight] }))}
          highlight={highlight}
        />
      </section>
    </>
  );
}

/** Simple line illustration: foot on paper against a wall, arrow heel → longest toe. */
function MeasureIllustration() {
  return (
    <svg viewBox="0 0 160 120" className="h-28 w-auto shrink-0 text-ink" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden>
      <rect x="20" y="8" width="70" height="104" className="fill-surface" />
      <path d="M20 8h70" strokeWidth={3} />
      <path d="M55 14c-12 0-20 9-21 22-1 14 3 24 3 36 0 12-4 18-4 26 0 8 6 12 13 12s12-5 12-13c0-10-2-18 2-30 3-10 7-22 7-32 0-12-5-21-12-21Z" />
      <path d="M108 14v92M104 18l4-4 4 4M104 102l4 4 4-4" className="text-accent-strong" stroke="currentColor" />
      <text x="118" y="64" fontSize="10" fill="currentColor" stroke="none" className="text-accent-strong">
        cm
      </text>
    </svg>
  );
}

export interface SizeGuideContentProps {
  /** wa.me link with size-guide context (WA "Konsultasi ukuran"). */
  waHref?: string;
  defaultCategory?: SizeGuideCategory;
  /** Raw size picked on the PDP (e.g. "8.5s (toddler)", "M"): its row is highlighted. */
  highlightSize?: string | null;
}

/**
 * Tabs per category (Ballet & Jazz / Pointe / Tap & Character / Ballroom / Dancewear), each with its own
 * size range + width guide (shoes) or body / tights tables (dancewear), how-to-measure and WA CTA.
 */
export function SizeGuideContent({ waHref, defaultCategory = "balletJazz", highlightSize }: SizeGuideContentProps) {
  const t = useTranslations("common");
  const cats: SizeGuideCategory[] = ["balletJazz", "pointe", "tapCharacter", "ballroom", "dancewear"];
  const highlight = highlightSize ? sizeKey(highlightSize) : null;
  return (
    <div className="flex flex-col gap-8">
      <section aria-labelledby="sg-how" className="flex flex-col gap-4 rounded-md bg-surface-alt p-4 md:flex-row md:items-center">
        <MeasureIllustration />
        <div className="flex flex-col gap-2">
          <h3 id="sg-how" className="eyebrow text-ink">
            {t("sizeGuide.howTitle")}
          </h3>
          <ol className="flex list-decimal flex-col gap-1 pl-5 text-sm text-ink">
            <li>{t("sizeGuide.how1")}</li>
            <li>{t("sizeGuide.how2")}</li>
            <li>{t("sizeGuide.how3")}</li>
          </ol>
        </div>
      </section>
      <Tabs
        label={t("sizeGuide.title")}
        defaultValue={defaultCategory}
        items={cats.map((c) => ({
          value: c,
          label: t(`sizeGuide.tabs.${c}`),
          content: (
            <div className="flex flex-col gap-6">
              {c === "pointe" ? (
                <Notice tone="info" title={t("sizeGuide.pointeCalloutTitle")}>
                  {t("sizeGuide.notes.pointe")}
                </Notice>
              ) : (
                <p className="text-sm text-ink-muted">{t(`sizeGuide.notes.${c}`)}</p>
              )}
              {c === "dancewear" ? (
                <DancewearTab highlight={c === defaultCategory ? highlight : null} />
              ) : (
                <ShoeTab category={c} highlight={c === defaultCategory ? highlight : null} />
              )}
              <p className="text-xs text-ink-muted">{t("sizeGuide.approxNote")}</p>
            </div>
          ),
        }))}
      />
      {waHref ? (
        <div className="flex flex-col gap-3 border-t border-border pt-6">
          <p className="text-sm text-ink">{t("sizeGuide.consultBody")}</p>
          <WhatsAppButton href={waHref} label={t("wa.sizeConsult")} fullWidth />
        </div>
      ) : null}
    </div>
  );
}

export interface SizeGuideDialogProps extends SizeGuideContentProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Optional trigger element (else control via open/onOpenChange). */
  trigger?: React.ReactElement;
}

/** SizeGuide in a responsive Dialog (bottom sheet on mobile). */
export function SizeGuideDialog({ open, onOpenChange, trigger, ...content }: SizeGuideDialogProps) {
  const t = useTranslations("common");
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
      <DialogContent title={t("sizeGuide.title")} size="lg">
        <SizeGuideContent {...content} />
      </DialogContent>
    </Dialog>
  );
}
