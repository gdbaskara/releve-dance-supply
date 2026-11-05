"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { normalizePhoneID } from "@/lib/format";
import { Input } from "@/components/ui/input";

/**
 * Raw user input → local digits after the country code (max 13).
 * Accepts "0812…", "812…", "62812…", "+62 812-…" (pasting a full number works).
 */
export function toLocalDigits(input: string): string {
  let d = (input || "").replace(/\D/g, "");
  if (d.startsWith("62")) d = d.slice(2);
  else if (d.startsWith("0")) d = d.slice(1);
  return d.slice(0, 13);
}

/** "81234567890" → "812-3456-7890" (display only). */
export function formatLocalDigits(local: string): string {
  return [local.slice(0, 3), local.slice(3, 7), local.slice(7)].filter(Boolean).join("-");
}

export interface PhoneChange {
  /** Local digits shown in the field (no 0/62 prefix). */
  local: string;
  /** E.164 (+62…) or null when invalid/incomplete — validate with this. */
  e164: string | null;
  valid: boolean;
}

export interface PhoneInputProps {
  /** Current value: E.164 ("+6281234567890"), local digits, or anything the user typed. */
  value: string;
  /** Receives the normalised E.164 (or null) — store `e164` in the form. */
  onValueChange: (change: PhoneChange) => void;
  label?: React.ReactNode;
  helper?: React.ReactNode;
  /** Error from the form (e.g. after blur/submit). */
  error?: React.ReactNode;
  /** Show the built-in "invalid number" error on blur when no `error` is given. Default true. */
  validateOnBlur?: boolean;
  name?: string;
  id?: string;
  disabled?: boolean;
  autoFocus?: boolean;
  onBlur?: React.FocusEventHandler<HTMLInputElement>;
}

/**
 * WhatsApp number input with fixed "+62" prefix, inputmode="tel", auto-format 812-3456-7890.
 * Uses `normalizePhoneID` from src/lib/format for validity.
 */
export function PhoneInput({
  value,
  onValueChange,
  label,
  helper,
  error,
  validateOnBlur = true,
  name,
  id,
  disabled,
  autoFocus,
  onBlur,
}: PhoneInputProps) {
  const t = useTranslations("common");
  const [touched, setTouched] = React.useState(false);
  const local = toLocalDigits(value);
  const e164 = local ? normalizePhoneID(local) : null;
  const showInvalid = validateOnBlur && touched && local.length > 0 && !e164;

  return (
    <>
      <Input
        id={id}
        type="tel"
        inputMode="tel"
        autoComplete="tel-national"
        autoFocus={autoFocus}
        disabled={disabled}
        prefix="+62"
        label={label ?? t("phone.label")}
        helper={helper ?? t("phone.help")}
        error={error ?? (showInvalid ? t("phone.invalid") : undefined)}
        placeholder="812-3456-7890"
        value={formatLocalDigits(local)}
        onChange={(e) => {
          const next = toLocalDigits(e.target.value);
          const n = next ? normalizePhoneID(next) : null;
          onValueChange({ local: next, e164: n, valid: n !== null });
        }}
        onBlur={(e) => {
          setTouched(true);
          onBlur?.(e);
        }}
      />
      {name ? <input type="hidden" name={name} value={e164 ?? ""} /> : null}
    </>
  );
}
