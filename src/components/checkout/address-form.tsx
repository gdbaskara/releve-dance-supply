"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Combobox } from "@/components/ui/combobox";
import { Input, Textarea } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { WhatsAppButton } from "@/components/store/whatsapp-button";

export interface AddressProvince {
  name: string;
  cities: { name: string; zone?: string }[];
}

export interface AddressValue {
  province: string;
  city: string;
  district: string;
  postalCode: string;
  line: string;
  note: string;
}

export const EMPTY_ADDRESS: AddressValue = { province: "", city: "", district: "", postalCode: "", line: "", note: "" };

export type AddressErrors = Partial<Record<keyof AddressValue, string>>;

export interface AddressFormProps {
  /** Pass data/shipping/java-areas.json → provinces (6 provinces, 119 cities). */
  provinces: AddressProvince[];
  value: AddressValue;
  onChange: (next: AddressValue) => void;
  errors?: AddressErrors;
  /** wa.me link for "Di luar Pulau Jawa?" */
  outsideJavaHref?: string;
  /** Field name prefix for native form posts, e.g. "address." */
  namePrefix?: string;
  disabled?: boolean;
}

/**
 * Province (select, 6) → Kab/Kota (combobox filtered by province) → Kecamatan → Kode pos (5 digits) →
 * Alamat lengkap → Catatan kurir. Province change clears the city.
 */
export function AddressForm({ provinces, value, onChange, errors = {}, outsideJavaHref, namePrefix = "", disabled }: AddressFormProps) {
  const t = useTranslations("common");
  const set = <K extends keyof AddressValue>(k: K, v: AddressValue[K]) => onChange({ ...value, [k]: v });
  const prov = provinces.find((p) => p.name === value.province);
  const cityOptions = React.useMemo(() => (prov?.cities ?? []).map((c) => ({ value: c.name, label: c.name })), [prov]);

  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-5 md:grid-cols-2">
        <Select
          label={t("address.province")}
          name={`${namePrefix}province`}
          placeholder={t("address.provincePlaceholder")}
          options={provinces.map((p) => ({ value: p.name, label: p.name }))}
          value={value.province}
          onChange={(e) => onChange({ ...value, province: e.target.value, city: "" })}
          error={errors.province}
          disabled={disabled}
          autoComplete="address-level1"
        />
        <Combobox
          label={t("address.city")}
          name={`${namePrefix}city`}
          options={cityOptions}
          value={value.city || null}
          onChange={(v) => set("city", v ?? "")}
          placeholder={prov ? t("address.cityPlaceholder") : t("address.cityDisabled")}
          disabled={disabled || !prov}
          error={errors.city}
        />
      </div>
      <div className="grid gap-5 md:grid-cols-[2fr_1fr]">
        <Input
          label={t("address.district")}
          name={`${namePrefix}district`}
          value={value.district}
          onChange={(e) => set("district", e.target.value)}
          error={errors.district}
          disabled={disabled}
          autoComplete="address-level3"
        />
        <Input
          label={t("address.postalCode")}
          name={`${namePrefix}postalCode`}
          inputMode="numeric"
          autoComplete="postal-code"
          maxLength={5}
          pattern="\d{5}"
          value={value.postalCode}
          onChange={(e) => set("postalCode", e.target.value.replace(/\D/g, "").slice(0, 5))}
          error={errors.postalCode}
          disabled={disabled}
          className="tabular"
        />
      </div>
      <Textarea
        label={t("address.line")}
        name={`${namePrefix}line`}
        placeholder={t("address.linePlaceholder")}
        value={value.line}
        onChange={(e) => set("line", e.target.value)}
        error={errors.line}
        disabled={disabled}
        autoComplete="street-address"
      />
      <Input
        label={t("address.note")}
        optional
        name={`${namePrefix}note`}
        placeholder={t("address.notePlaceholder")}
        value={value.note}
        onChange={(e) => set("note", e.target.value)}
        error={errors.note}
        disabled={disabled}
      />
      {outsideJavaHref ? <WhatsAppButton href={outsideJavaHref} variant="link" label={t("address.outsideJava")} /> : null}
    </div>
  );
}
