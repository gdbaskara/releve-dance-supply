"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Lock } from "lucide-react";
import { formatIDR } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Notice } from "@/components/ui/notice";
import { LogoTile } from "@/components/store/logo-tile";

export type CardBrand = "VISA" | "MASTERCARD" | "JCB" | null;

/** Visa ^4 · Mastercard ^5[1-5] / ^2[2-7] · JCB ^35. */
export function detectCardBrand(number: string): CardBrand {
  const d = number.replace(/\D/g, "");
  if (/^4/.test(d)) return "VISA";
  if (/^(5[1-5]|2[2-7])/.test(d)) return "MASTERCARD";
  if (/^35/.test(d)) return "JCB";
  return null;
}

/** Digits → "4811 1111 1111 1114" (max 16). */
export function maskCardNumber(input: string): string {
  return input.replace(/\D/g, "").slice(0, 16).replace(/(\d{4})(?=\d)/g, "$1 ");
}

/** "1228" → "12/28". */
export function maskExpiry(input: string): string {
  const d = input.replace(/\D/g, "").slice(0, 4);
  return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
}

function luhn(d: string): boolean {
  let sum = 0;
  let alt = false;
  for (let i = d.length - 1; i >= 0; i--) {
    let n = Number(d[i]);
    if (alt) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    alt = !alt;
  }
  return d.length >= 13 && sum % 10 === 0;
}

function expiryValid(mmYY: string, now = new Date()): boolean {
  const m = /^(\d{2})\/(\d{2})$/.exec(mmYY);
  if (!m) return false;
  const month = Number(m[1]);
  const year = 2000 + Number(m[2]);
  if (month < 1 || month > 12) return false;
  return new Date(year, month, 1) > now; // valid through end of that month
}

export interface CardFormValues {
  number: string;
  expiry: string;
  cvv: string;
  brand: CardBrand;
}

export interface CardFormProps {
  amountIdr: number;
  /** Receives raw digits; the mock provider tokenises — card data is never stored. */
  onSubmit: (values: CardFormValues) => void;
  loading?: boolean;
  /** Show the demo test-card note. */
  testCard?: string;
  /** Server-side error (e.g. declined). */
  error?: string;
}

/** Card number (4-4-4-4 mask + brand detect), MM/YY, CVV, "Data kartu tidak disimpan". Full payment only. */
export function CardForm({ amountIdr, onSubmit, loading, testCard = "4811 1111 1111 1114", error }: CardFormProps) {
  const t = useTranslations("common");
  const [number, setNumber] = React.useState("");
  const [expiry, setExpiry] = React.useState("");
  const [cvv, setCvv] = React.useState("");
  const [submitted, setSubmitted] = React.useState(false);
  const digits = number.replace(/\D/g, "");
  const brand = detectCardBrand(digits);
  const errs = {
    number: !luhn(digits) ? t("card.invalidNumber") : undefined,
    expiry: !expiryValid(expiry) ? t("card.invalidExpiry") : undefined,
    cvv: !/^\d{3,4}$/.test(cvv) ? t("card.invalidCvv") : undefined,
  };
  const ok = !errs.number && !errs.expiry && !errs.cvv;

  return (
    <form
      noValidate
      className="flex flex-col gap-5"
      onSubmit={(e) => {
        e.preventDefault();
        setSubmitted(true);
        if (ok) onSubmit({ number: digits, expiry, cvv, brand });
      }}
    >
      <div className="flex gap-2" aria-hidden>
        {(["VISA", "MASTERCARD", "JCB"] as const).map((b) => (
          <LogoTile key={b} code={b} size="sm" active={brand === null || brand === b} />
        ))}
      </div>
      <Input
        label={t("card.number")}
        inputMode="numeric"
        autoComplete="cc-number"
        placeholder="1234 5678 9012 3456"
        value={number}
        onChange={(e) => setNumber(maskCardNumber(e.target.value))}
        error={submitted ? errs.number : undefined}
        className="tabular font-mono tracking-[0.04em]"
        suffix={brand ? <LogoTile code={brand} size="sm" className="mr-2" /> : undefined}
        aria-description={brand ? t("card.brand", { brand }) : undefined}
      />
      <div className="grid grid-cols-2 gap-4">
        <Input
          label={t("card.expiry")}
          inputMode="numeric"
          autoComplete="cc-exp"
          placeholder="MM/YY"
          value={expiry}
          onChange={(e) => setExpiry(maskExpiry(e.target.value))}
          error={submitted ? errs.expiry : undefined}
          className="tabular"
        />
        <Input
          label={t("card.cvv")}
          inputMode="numeric"
          autoComplete="cc-csc"
          type="password"
          maxLength={4}
          placeholder="123"
          value={cvv}
          onChange={(e) => setCvv(e.target.value.replace(/\D/g, "").slice(0, 4))}
          error={submitted ? errs.cvv : undefined}
          className="tabular"
        />
      </div>
      <p className="flex items-center gap-2 text-sm text-ink-muted">
        <Lock size={16} strokeWidth={1.5} aria-hidden />
        {t("card.notStored")}
      </p>
      {testCard ? <Notice tone="info">{t("card.testCard", { number: testCard })}</Notice> : null}
      {error ? (
        <Notice tone="error" live>
          {error}
        </Notice>
      ) : null}
      <Button type="submit" fullWidth loading={loading}>
        {t("card.pay", { amount: formatIDR(amountIdr) })}
      </Button>
    </form>
  );
}
