"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { CreditCard } from "lucide-react";
import { PAYMENT_OPTIONS, type PaymentChannel, type PaymentMethod } from "@/lib/contracts";
import { RadioCard, RadioGroup } from "@/components/ui/radio";
import { LogoTile } from "@/components/store/logo-tile";
import { cn } from "@/lib/utils/cn";

export interface PaymentSelection {
  method: PaymentMethod;
  channel?: PaymentChannel;
}

/** "QRIS" | "EWALLET:GOPAY" | "VA:BCA" | "CARD" */
export function paymentKey(sel: PaymentSelection): string {
  return sel.channel ? `${sel.method}:${sel.channel}` : sel.method;
}
export function parsePaymentKey(key: string): PaymentSelection {
  const [method, channel] = key.split(":") as [PaymentMethod, PaymentChannel | undefined];
  return channel ? { method, channel } : { method };
}

export interface PaymentMethodTileProps {
  option: PaymentSelection;
  selected?: boolean;
  disabled?: boolean;
}

/** Radio card (4px radius): logo tile · name · short description. Selected = 2px ink border. */
export function PaymentMethodTile({ option, selected, disabled }: PaymentMethodTileProps) {
  const t = useTranslations("common");
  const code = option.channel ?? option.method;
  const name = t(`payment.names.${code}`);
  const desc =
    option.method === "EWALLET"
      ? t("payment.desc.EWALLET", { wallet: name })
      : option.method === "VA"
        ? t("payment.desc.VA")
        : t(`payment.desc.${option.method}`);
  return (
    <RadioCard
      value={paymentKey(option)}
      disabled={disabled}
      hideIndicator
      media={
        option.method === "CARD" ? (
          <span className={cn("inline-flex h-8 min-w-14 items-center justify-center rounded-sm border", selected ? "border-border-strong text-ink" : "border-border text-ink-subtle")}>
            <CreditCard size={18} strokeWidth={1.5} aria-hidden />
          </span>
        ) : (
          <LogoTile code={code} active={selected} />
        )
      }
      title={name}
      description={desc}
      className="min-h-[72px]"
    />
  );
}

export interface PaymentMethodGroupProps {
  value: PaymentSelection | null;
  onChange: (sel: PaymentSelection) => void;
  /** Subset of PAYMENT_OPTIONS (default: all, in contract order). */
  options?: PaymentSelection[];
  disabledKeys?: string[];
  error?: string;
  name?: string;
}

const GROUPS: PaymentMethod[] = ["QRIS", "EWALLET", "VA", "CARD"];

/** All tiles from PAYMENT_OPTIONS grouped QRIS · E-wallet · Virtual Account · Kartu (single radiogroup). */
export function PaymentMethodGroup({ value, onChange, options = PAYMENT_OPTIONS, disabledKeys = [], error, name }: PaymentMethodGroupProps) {
  const t = useTranslations("common");
  const selectedKey = value ? paymentKey(value) : "";
  return (
    <RadioGroup
      legend={t("payment.legend")}
      value={selectedKey}
      onValueChange={(k) => onChange(parsePaymentKey(k))}
      error={error}
      name={name}
      className="gap-6"
    >
      {GROUPS.map((g) => {
        const opts = options.filter((o) => o.method === g);
        if (!opts.length) return null;
        return (
          <div key={g} role="presentation" className="flex flex-col gap-2">
            <h3 className="eyebrow text-ink-muted">{t(`payment.groups.${g}`)}</h3>
            <div className={cn("grid gap-2", opts.length > 1 && "sm:grid-cols-2")}>
              {opts.map((o) => {
                const k = paymentKey(o);
                return <PaymentMethodTile key={k} option={o} selected={k === selectedKey} disabled={disabledKeys.includes(k)} />;
              })}
            </div>
          </div>
        );
      })}
    </RadioGroup>
  );
}
