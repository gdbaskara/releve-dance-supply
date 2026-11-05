"use client";

import * as React from "react";
import { useLocale, useTranslations } from "next-intl";
import glossary from "../../../design-system/glossary.json";
import type { StockStatus } from "@/lib/contracts";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { InfoTip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils/cn";

export interface SegmentOptionState {
  value: string;
  status: StockStatus | null;
  available?: number;
}

interface OptionSegmentProps {
  options: SegmentOptionState[];
  value: string | null;
  onChange: (v: string) => void;
  label?: string;
  error?: string;
  className?: string;
}

function OptionSegment({
  term,
  label,
  options,
  value,
  onChange,
  error,
  className,
}: OptionSegmentProps & { term: "width" | "shank" }) {
  const t = useTranslations("common");
  const locale = useLocale() === "en" ? "en" : "id";
  const explain = glossary.terms[term][locale];
  const errId = React.useId();
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <p className="flex items-center text-sm text-ink">
        <span className="eyebrow mr-1 text-ink-muted">{label}</span>
        <InfoTip label={t("variant.whatIs", { term: label ?? term })} content={explain} />
        <span className="font-medium">{value ?? ""}</span>
      </p>
      <div aria-describedby={error ? errId : undefined}>
        <SegmentedControl
          label={label ?? term}
          value={value}
          onChange={onChange}
          options={options.map((o) => ({
            value: o.value,
            label: o.value,
            disabled: o.status === null,
            unavailable: o.status === "SOLD_OUT",
            srHint: o.status === "SOLD_OUT" ? t("stock.soldout") : o.status === "PREORDER" ? t("stock.preorder") : undefined,
            marker: o.status === "PREORDER" ? t("variant.preorderShort") : undefined,
          }))}
        />
      </div>
      {error ? (
        <p id={errId} className="text-sm text-error">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/** Width segmented control (Narrow/Medium/Wide or A–EE) with a glossary InfoTip. */
export function WidthSelector(props: OptionSegmentProps) {
  const t = useTranslations("common");
  return <OptionSegment term="width" {...props} label={props.label ?? t("variant.width")} />;
}

/** Shank segmented control (Full Soft / Full Normal / Full Reinforced / Full Extra Reinforced) — SD09, SD40VC. */
export function ShankSelector(props: OptionSegmentProps) {
  const t = useTranslations("common");
  return <OptionSegment term="shank" {...props} label={props.label ?? t("variant.shank")} />;
}
