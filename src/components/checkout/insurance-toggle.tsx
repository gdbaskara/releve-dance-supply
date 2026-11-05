"use client";

import { useTranslations } from "next-intl";
import { formatIDR } from "@/lib/format";
import { Checkbox } from "@/components/ui/checkbox";

export interface InsuranceToggleProps {
  /** Default ON (docs/07 §7.3) — the form should initialise to true. */
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  /** Premium in Rupiah (from ShippingRate.insuranceIdr). */
  amountIdr: number;
  disabled?: boolean;
  name?: string;
}

/** "Asuransi pengiriman" checkbox with the premium on the right. */
export function InsuranceToggle({ checked, onCheckedChange, amountIdr, disabled, name }: InsuranceToggleProps) {
  const t = useTranslations("common");
  return (
    <Checkbox
      checked={checked}
      onCheckedChange={(c) => onCheckedChange(c === true)}
      disabled={disabled}
      name={name}
      label={t("insurance.label")}
      description={t("insurance.help")}
      aside={`+${formatIDR(amountIdr)}`}
      className="rounded-md border border-border px-4"
    />
  );
}
