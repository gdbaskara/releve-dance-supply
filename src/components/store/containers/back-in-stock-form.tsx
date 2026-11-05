"use client";
/** STK-07 / D3: "Kabari Saya via WA" — store the buyer's WA number for a sold-out variant. */
import * as React from "react";
import { useLocale, useTranslations } from "next-intl";
import { requestBackInStockAction } from "@/lib/actions/storefront";
import { PhoneInput } from "@/components/checkout/phone-input";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";

export interface BackInStockFormProps {
  sku: string;
  variantLabel: string;
}

export function BackInStockForm({ sku, variantLabel }: BackInStockFormProps) {
  const t = useTranslations("pdp.notify");
  const locale = useLocale() as "id" | "en";
  const [wa, setWa] = React.useState("");
  const [e164, setE164] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [done, setDone] = React.useState<null | "ok" | "already">(null);
  const [pending, start] = React.useTransition();

  if (done) {
    return (
      <Notice tone="success" title={t("title")}>
        {done === "ok" ? t("success", { variant: variantLabel }) : t("already")}
      </Notice>
    );
  }

  return (
    <form
      noValidate
      className="flex flex-col gap-4 rounded-md border border-border p-4"
      aria-labelledby={`bis-${sku}`}
      onSubmit={(e) => {
        e.preventDefault();
        if (!e164) {
          setError(t("invalidWa"));
          return;
        }
        setError(null);
        start(async () => {
          const res = await requestBackInStockAction({ sku, wa: e164, locale });
          if (res.ok) setDone(res.alreadyRequested ? "already" : "ok");
          else setError(res.error === "INVALID_WA" ? t("invalidWa") : t("error"));
        });
      }}
    >
      <div className="flex flex-col gap-1">
        <p id={`bis-${sku}`} className="text-sm font-semibold text-ink">
          {t("title")}
        </p>
        <p className="text-sm text-ink-muted">{t("body", { variant: variantLabel })}</p>
      </div>
      <PhoneInput
        value={wa}
        onValueChange={(c) => {
          setWa(c.local);
          setE164(c.e164);
          if (error) setError(null);
        }}
        label={t("label")}
        helper={t("help")}
        error={error ?? undefined}
        autoFocus
      />
      <Button type="submit" variant="secondary" fullWidth loading={pending}>
        {t("submit")}
      </Button>
    </form>
  );
}
