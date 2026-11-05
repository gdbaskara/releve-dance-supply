"use client";

import { useTranslations } from "next-intl";
import type { VaChannel } from "@/lib/contracts";
import { formatIDR } from "@/lib/format";
import { Accordion } from "@/components/ui/accordion";
import { CopyButton } from "@/components/ui/copy-button";
import { LogoTile } from "@/components/store/logo-tile";
import { Countdown } from "./countdown";

/** "8808123456789012" → "8808 1234 5678 9012". */
export function groupDigits(value: string, size = 4): string {
  return value.replace(/\s+/g, "").replace(new RegExp(`(.{${size}})(?=.)`, "g"), "$1 ");
}

export interface VAPanelProps {
  bank: VaChannel;
  vaNumber: string;
  amountIdr: number;
  expiresAt: Date | string | number;
  onExpire?: () => void;
}

/** Bank tile · "Nomor Virtual Account" mono 20px grouped by 4 + Salin · amount + Salin · Countdown · how-to accordion. */
export function VAPanel({ bank, vaNumber, amountIdr, expiresAt, onExpire }: VAPanelProps) {
  const t = useTranslations("common");
  const bankName = t(`payment.banks.${bank}`);
  const steps = (k: "atm" | "mbanking" | "ibanking") => (
    <ol className="flex list-decimal flex-col gap-1.5 pl-5 text-sm">
      {(["1", "2", "3", "4"] as const).map((n) => (
        <li key={n}>{t(`pay.vaSteps.${k}.${n}`, { bank: bankName })}</li>
      ))}
    </ol>
  );
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <LogoTile code={bank} />
        <span className="text-sm font-semibold">{t(`payment.names.${bank}`)}</span>
      </div>
      <div className="flex flex-col gap-1 rounded-md border border-border p-4">
        <span className="eyebrow text-ink-muted">{t("pay.vaNumber")}</span>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="tabular font-mono text-xl font-medium tracking-[0.04em]">{groupDigits(vaNumber)}</span>
          <CopyButton value={vaNumber.replace(/\s+/g, "")} ariaLabel={t("pay.copyVa")} appearance="outline" />
        </div>
      </div>
      <div className="flex items-center justify-between gap-4 rounded-md border border-border p-4">
        <div className="flex flex-col">
          <span className="eyebrow text-ink-muted">{t("pay.amount")}</span>
          <span className="tabular text-xl font-semibold">{formatIDR(amountIdr)}</span>
          <span className="text-xs text-ink-muted">{t("pay.exactAmount")}</span>
        </div>
        <CopyButton value={String(amountIdr)} ariaLabel={t("pay.copyAmount")} />
      </div>
      <Countdown expiresAt={expiresAt} onExpire={onExpire} />
      <div className="flex flex-col gap-2">
        <h3 className="eyebrow text-ink">{t("pay.howTo")}</h3>
        <Accordion
          headerStyle="text"
          items={[
            { value: "atm", title: t("pay.atm", { bank: bankName }), content: steps("atm") },
            { value: "mbanking", title: t("pay.mbanking", { bank: bankName }), content: steps("mbanking") },
            { value: "ibanking", title: t("pay.ibanking", { bank: bankName }), content: steps("ibanking") },
          ]}
        />
      </div>
    </div>
  );
}
