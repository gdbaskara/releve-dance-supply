"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Notice } from "@/components/ui/notice";

const ORDER_NO = /^RDS-\d{6}-[0-9A-Z]{4}$/;

export interface TrackFormProps {
  defaultOrderNo?: string;
  /** Server-side result of a previous lookup. */
  error?: "notFound" | "rateLimited" | null;
}

/** ORD-03 — order number + last 4 WA digits → /track/[orderNo]?wa=XXXX (verified server-side). */
export function TrackForm({ defaultOrderNo = "", error }: TrackFormProps) {
  const t = useTranslations("order.track");
  const router = useRouter();
  const [orderNo, setOrderNo] = React.useState(defaultOrderNo);
  const [last4, setLast4] = React.useState("");
  const [submitted, setSubmitted] = React.useState(false);
  const [pending, startTransition] = React.useTransition();
  const no = orderNo.trim().toUpperCase();
  const errs = {
    orderNo: ORDER_NO.test(no) ? undefined : t("invalidOrderNo"),
    last4: /^\d{4}$/.test(last4) ? undefined : t("invalidLast4"),
  };
  return (
    <form
      noValidate
      className="flex flex-col gap-5"
      onSubmit={(e) => {
        e.preventDefault();
        setSubmitted(true);
        if (errs.orderNo || errs.last4) return;
        startTransition(() => router.push(`/track/${no}?wa=${last4}`));
      }}
    >
      {error && !pending ? (
        <Notice tone="error" live>
          {error === "rateLimited" ? t("rateLimited") : t("notFound")}
        </Notice>
      ) : null}
      <Input
        label={t("orderNo")}
        name="orderNo"
        placeholder={t("orderNoPlaceholder")}
        helper={t("orderNoHelp")}
        autoCapitalize="characters"
        autoComplete="off"
        spellCheck={false}
        value={orderNo}
        onChange={(e) => setOrderNo(e.target.value.toUpperCase())}
        error={submitted ? errs.orderNo : undefined}
        className="tabular font-mono uppercase tracking-[0.04em]"
      />
      <Input
        label={t("waLast4")}
        name="waLast4"
        placeholder={t("waLast4Placeholder")}
        inputMode="numeric"
        autoComplete="off"
        maxLength={4}
        value={last4}
        onChange={(e) => setLast4(e.target.value.replace(/\D/g, "").slice(0, 4))}
        error={submitted ? errs.last4 : undefined}
        className="tabular font-mono tracking-[0.2em]"
      />
      <Button type="submit" fullWidth loading={pending}>
        {t("submit")}
      </Button>
    </form>
  );
}
