"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Notice } from "@/components/ui/notice";
import { Tabs } from "@/components/ui/segmented-control";
import { WhatsAppButton } from "./whatsapp-button";

export type SizeGuideCategory = "balletJazz" | "pointe" | "tapCharacter" | "ballroom" | "dancewear";

/*
 * APPROXIMATE — replace with Só Dança chart (Q-06).
 * Generic US women's / kids' shoe size → foot length (cm) conversion, plus EU approximation.
 * Dance shoes can run differently per model; the copy tells shoppers to consult on WhatsApp.
 */
const SHOE_ADULT: [us: string, cm: number, eu: string][] = [
  ["4", 20.8, "34.5"],
  ["4.5", 21.3, "35"],
  ["5", 21.6, "35.5"],
  ["5.5", 22.2, "36"],
  ["6", 22.5, "36.5"],
  ["6.5", 23.0, "37"],
  ["7", 23.5, "37.5"],
  ["7.5", 23.8, "38"],
  ["8", 24.1, "38.5"],
  ["8.5", 24.6, "39"],
  ["9", 25.1, "40"],
  ["9.5", 25.4, "40.5"],
  ["10", 25.9, "41"],
  ["10.5", 26.2, "41.5"],
  ["11", 26.7, "42"],
  ["12", 27.6, "43"],
];
/* APPROXIMATE — replace with Só Dança chart (Q-06). Kids sizes (s = child). */
const SHOE_KIDS: [us: string, cm: number, eu: string][] = [
  ["8s", 15.2, "25"],
  ["9s", 15.9, "26"],
  ["10s", 16.5, "27"],
  ["11s", 17.5, "28"],
  ["12s", 18.4, "30"],
  ["13s", 19.1, "31"],
  ["1s", 19.8, "32"],
  ["2s", 20.6, "33"],
  ["3s", 21.6, "34"],
];
/* APPROXIMATE — replace with Só Dança chart (Q-06). Dancewear body measurements in cm. */
const DANCEWEAR: [size: string, height: string, chest: string, waist: string, hip: string][] = [
  ["4-6", "104–116", "56–61", "53–56", "58–64"],
  ["8-10", "128–140", "64–71", "57–61", "67–74"],
  ["12-14", "146–158", "72–79", "61–65", "76–83"],
  ["XS", "150–158", "76–81", "58–63", "81–86"],
  ["S", "155–163", "81–86", "63–68", "86–91"],
  ["M", "160–168", "86–91", "68–73", "91–96"],
  ["L", "165–173", "91–97", "73–79", "96–102"],
  ["XL", "168–175", "97–103", "79–85", "102–108"],
];

const th = "eyebrow border-b border-border-strong px-3 py-3 text-left text-ink-muted";
const td = "tabular border-b border-border px-3 py-2.5 text-sm text-ink";

function ShoeTable() {
  const t = useTranslations("common");
  const rows = (data: typeof SHOE_ADULT, group: string) => (
    <>
      <tr>
        <th colSpan={3} scope="colgroup" className="bg-surface-alt px-3 py-2 text-left text-xs font-semibold text-ink">
          {group}
        </th>
      </tr>
      {data.map(([us, cm, eu]) => (
        <tr key={us}>
          <th scope="row" className={`${td} font-semibold`}>
            {us}
          </th>
          <td className={td}>{cm.toFixed(1)}</td>
          <td className={`${td} text-ink-muted`}>{eu}</td>
        </tr>
      ))}
    </>
  );
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
        <tbody>
          {rows(SHOE_ADULT, t("sizeGroups.adult"))}
          {rows(SHOE_KIDS, t("sizeGroups.child"))}
        </tbody>
      </table>
    </div>
  );
}

function DancewearTable() {
  const t = useTranslations("common");
  return (
    <div className="-mx-1 overflow-x-auto px-1">
      <table className="w-full min-w-[420px] border-collapse">
        <caption className="sr-only">{t("sizeGuide.dancewearCaption")}</caption>
        <thead>
          <tr>
            {(["size", "height", "chest", "waist", "hip"] as const).map((k) => (
              <th key={k} scope="col" className={th}>
                {t(`sizeGuide.cols.${k}`)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {DANCEWEAR.map(([size, ...rest]) => (
            <tr key={size}>
              <th scope="row" className={`${td} font-semibold`}>
                {size}
              </th>
              {rest.map((v, i) => (
                <td key={i} className={td}>
                  {v}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
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
}

/** Tabs per category (Ballet & Jazz / Pointe / Tap & Character / Ballroom / Dancewear) + how-to-measure + WA CTA. */
export function SizeGuideContent({ waHref, defaultCategory = "balletJazz" }: SizeGuideContentProps) {
  const t = useTranslations("common");
  const cats: SizeGuideCategory[] = ["balletJazz", "pointe", "tapCharacter", "ballroom", "dancewear"];
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
            <div className="flex flex-col gap-4">
              {c === "pointe" ? (
                <Notice tone="info" title={t("sizeGuide.pointeCalloutTitle")}>
                  {t("sizeGuide.notes.pointe")}
                </Notice>
              ) : (
                <p className="text-sm text-ink-muted">{t(`sizeGuide.notes.${c}`)}</p>
              )}
              {c === "dancewear" ? <DancewearTable /> : <ShoeTable />}
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
