"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import type { ShippingRate, ShippingType } from "@/lib/contracts";
import { formatIDR } from "@/lib/format";
import { RadioCard, RadioGroup } from "@/components/ui/radio";
import { LogoTile } from "@/components/store/logo-tile";
import { Skeleton } from "@/components/ui/skeleton";

export interface CourierOptionProps {
  rate: ShippingRate;
  disabled?: boolean;
}

/** One radio card: courier tile · "JNE YES" · ETA (+ cutoff for instant) · price. Render inside CourierOptions/RadioGroup. */
export function CourierOption({ rate, disabled }: CourierOptionProps) {
  const t = useTranslations("common");
  const eta = rate.etaUnit === "hours" ? t("courier.etaHours", { eta: rate.eta.replace("-", "–") }) : t("courier.etaDays", { eta: rate.eta.replace("-", "–") });
  return (
    <RadioCard
      value={rate.serviceCode}
      disabled={disabled}
      media={<LogoTile code={rate.courier} size="sm" />}
      title={`${rate.courier} ${rate.service}`}
      description={
        <>
          {eta}
          {rate.cutoff ? <span className="block text-xs text-warning">{t("courier.cutoff", { cutoff: rate.cutoff })}</span> : null}
        </>
      }
      aside={formatIDR(rate.priceIdr)}
    />
  );
}

export interface CourierOptionsProps {
  rates: ShippingRate[];
  value: string | null;
  onChange: (serviceCode: string) => void;
  /** Rates are being fetched. */
  loading?: boolean;
  error?: string;
  /** Shown when rates is empty and not loading. */
  emptyText?: React.ReactNode;
  name?: string;
}

const ORDER: ShippingType[] = ["instant", "express", "regular"];

/** Radio list grouped Instan / Express / Reguler (cheapest first inside a group). */
export function CourierOptions({ rates, value, onChange, loading, error, emptyText, name }: CourierOptionsProps) {
  const t = useTranslations("common");
  if (loading) {
    return (
      <div className="flex flex-col gap-2" aria-busy>
        <span className="sr-only">{t("loading")}</span>
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-16 rounded-md" />
        ))}
      </div>
    );
  }
  if (rates.length === 0) return <p className="text-sm text-ink-muted">{emptyText ?? t("courier.empty")}</p>;
  return (
    <RadioGroup legend={t("courier.groupLabel")} value={value ?? ""} onValueChange={onChange} error={error} name={name} className="gap-6">
      {ORDER.map((type) => {
        const group = rates.filter((r) => r.type === type).sort((a, b) => a.priceIdr - b.priceIdr);
        if (!group.length) return null;
        return (
          <div key={type} role="presentation" className="flex flex-col gap-2">
            <h3 className="eyebrow text-ink-muted">{t(`courier.${type}`)}</h3>
            {group.map((r) => (
              <CourierOption key={r.serviceCode} rate={r} />
            ))}
          </div>
        );
      })}
    </RadioGroup>
  );
}
