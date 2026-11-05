"use client";

import { useTranslations } from "next-intl";
import { ExternalLink, Smartphone } from "lucide-react";
import type { EwalletChannel } from "@/lib/contracts";
import { formatIDR } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { LogoTile } from "@/components/store/logo-tile";
import { formatRemaining, useCountdown } from "./countdown";

export interface EwalletPanelProps {
  wallet: EwalletChannel;
  /** Deeplink / checkout URL from PaymentInstruction.redirectUrl. */
  redirectUrl: string;
  amountIdr: number;
  expiresAt: Date | string | number;
  onExpire?: () => void;
  /** Optional "pay with QRIS instead" action. */
  onSwitchToQris?: () => void;
}

/** Wallet tile · "Buka {wallet}" · "Selesaikan di aplikasi dalam {mm:ss}". */
export function EwalletPanel({ wallet, redirectUrl, amountIdr, expiresAt, onExpire, onSwitchToQris }: EwalletPanelProps) {
  const t = useTranslations("common");
  const remaining = useCountdown(expiresAt, onExpire);
  const name = t(`payment.names.${wallet}`);
  const warn = remaining > 0 && remaining < 5 * 60 * 1000;
  return (
    <div className="flex flex-col items-center gap-5 text-center">
      <div className="flex size-20 items-center justify-center rounded-pill bg-surface-alt">
        <Smartphone size={32} strokeWidth={1.25} aria-hidden />
      </div>
      <LogoTile code={wallet} />
      <div className="flex flex-col">
        <span className="eyebrow text-ink-muted">{t("pay.amount")}</span>
        <span className="tabular text-2xl font-semibold">{formatIDR(amountIdr)}</span>
      </div>
      <Button asChild fullWidth>
        <a href={redirectUrl} aria-disabled={remaining <= 0 || undefined}>
          {t("pay.openWallet", { wallet: name })}
          <ExternalLink size={18} strokeWidth={1.5} aria-hidden />
        </a>
      </Button>
      <p className="text-sm text-ink" aria-live="off">
        {remaining > 0 ? (
          <span className={warn ? "tabular font-semibold text-warning" : "tabular"} suppressHydrationWarning>
            {t("pay.finishIn", { time: formatRemaining(remaining, true) })}
          </span>
        ) : (
          <span className="font-semibold text-error">{t("countdown.expired")}</span>
        )}
      </p>
      <p className="text-xs text-ink-muted">{t("pay.ewalletNote")}</p>
      {onSwitchToQris ? (
        <button type="button" onClick={onSwitchToQris} className="min-h-11 text-sm underline underline-offset-[3px] hover:text-accent-strong">
          {t("pay.switchQris")}
        </button>
      ) : null}
    </div>
  );
}
