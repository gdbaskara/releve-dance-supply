"use client";

import * as React from "react";
import { Collapsible } from "radix-ui";
import { useTranslations } from "next-intl";
import { ChevronDown, Tag, X } from "lucide-react";
import { formatIDR } from "@/lib/format";
import { cn } from "@/lib/utils/cn";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ProductImage } from "@/components/store/product-image";

export interface SummaryItem {
  name: string;
  variantLabel: string;
  qty: number;
  priceIdr: number;
  imageUrl: string | null;
  isPreorder?: boolean;
}

export interface OrderSummaryProps {
  items: SummaryItem[];
  subtotalIdr: number;
  /** null = not chosen yet ("Dihitung setelah alamat"). */
  shippingIdr: number | null;
  insuranceIdr?: number;
  discountIdr?: number;
  /** Server-computed total. */
  totalIdr: number;
  /** Slot for `<VoucherField/>`. */
  voucher?: React.ReactNode;
  /**
   * responsive (default): collapsible bar < 1024px, sticky panel ≥ 1024px ·
   * panel: always the panel · collapsible: always collapsible.
   */
  mode?: "responsive" | "panel" | "collapsible";
  className?: string;
}

function Rows({ items, subtotalIdr, shippingIdr, insuranceIdr = 0, discountIdr = 0, totalIdr, voucher }: OrderSummaryProps) {
  const t = useTranslations("common");
  const row = "flex items-baseline justify-between gap-4 text-sm";
  return (
    <div className="flex flex-col gap-4">
      <ul className="flex flex-col gap-3">
        {items.map((it, i) => (
          <li key={`${it.name}-${it.variantLabel}-${i}`} className="flex gap-3">
            <div className="relative w-14 shrink-0">
              <ProductImage src={it.imageUrl} alt={it.name} sizes="56px" />
              <span className="tabular absolute -right-1.5 -top-1.5 inline-flex size-5 items-center justify-center rounded-pill bg-ink-muted text-[11px] font-semibold text-ink-inverse">
                {it.qty}
              </span>
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="truncate text-sm font-medium">{it.name}</span>
              <span className="text-xs text-ink-muted">{it.variantLabel}</span>
              {it.isPreorder ? (
                <Badge variant="warning" className="self-start">
                  {t("stock.preorder")}
                </Badge>
              ) : null}
            </div>
            <span className="tabular text-sm font-medium">{formatIDR(it.priceIdr * it.qty)}</span>
          </li>
        ))}
      </ul>
      {voucher ? <div className="border-t border-border pt-4">{voucher}</div> : null}
      <dl className="flex flex-col gap-2 border-t border-border pt-4">
        <div className={row}>
          <dt className="text-ink-muted">{t("summary.subtotal")}</dt>
          <dd className="tabular">{formatIDR(subtotalIdr)}</dd>
        </div>
        <div className={row}>
          <dt className="text-ink-muted">{t("summary.shipping")}</dt>
          <dd className={cn("tabular", shippingIdr === null && "text-ink-muted")}>
            {shippingIdr === null ? t("summary.shippingPending") : formatIDR(shippingIdr)}
          </dd>
        </div>
        {insuranceIdr > 0 ? (
          <div className={row}>
            <dt className="text-ink-muted">{t("summary.insurance")}</dt>
            <dd className="tabular">{formatIDR(insuranceIdr)}</dd>
          </div>
        ) : null}
        {discountIdr > 0 ? (
          <div className={row}>
            <dt className="text-ink-muted">{t("summary.discount")}</dt>
            <dd className="tabular text-success">−{formatIDR(discountIdr)}</dd>
          </div>
        ) : null}
        <div className="mt-2 flex items-baseline justify-between gap-4 border-t border-border pt-4">
          <dt className="eyebrow">{t("summary.total")}</dt>
          <dd className="tabular text-xl font-semibold">{formatIDR(totalIdr)}</dd>
        </div>
      </dl>
    </div>
  );
}

/** Checkout summary: sticky right panel on desktop, collapsible "Lihat ringkasan (Rp …)" bar on mobile. */
export function OrderSummary(props: OrderSummaryProps) {
  const t = useTranslations("common");
  const { mode = "responsive", className, totalIdr } = props;
  const [open, setOpen] = React.useState(false);
  const collapsible = (
    <Collapsible.Root open={open} onOpenChange={setOpen} className={cn("border-y border-border bg-surface-alt", mode === "responsive" && "lg:hidden")}>
      <Collapsible.Trigger className="flex min-h-14 w-full items-center justify-between gap-4 px-4 text-left focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-focus">
        <span className="flex items-center gap-2 text-sm font-medium">
          {open ? t("summary.hide") : t("summary.show", { total: formatIDR(totalIdr) })}
          <ChevronDown size={18} strokeWidth={1.5} aria-hidden className={cn("transition-transform", open && "rotate-180")} />
        </span>
        <span className="tabular text-base font-semibold">{formatIDR(totalIdr)}</span>
      </Collapsible.Trigger>
      <Collapsible.Content className="px-4 pb-5">
        <Rows {...props} />
      </Collapsible.Content>
    </Collapsible.Root>
  );
  const panel = (
    <aside
      aria-label={t("summary.title")}
      className={cn("flex flex-col gap-5 rounded-md bg-surface-alt p-6", mode === "responsive" && "hidden lg:sticky lg:top-[calc(var(--header-h)+24px)] lg:flex")}
    >
      <h2 className="eyebrow">{t("summary.title")}</h2>
      <Rows {...props} />
    </aside>
  );
  return (
    <div className={className}>
      {mode !== "panel" ? collapsible : null}
      {mode !== "collapsible" ? panel : null}
    </div>
  );
}

export interface VoucherFieldProps {
  value: string;
  onValueChange: (v: string) => void;
  onApply: (code: string) => void;
  /** Applied code (shows the applied chip). */
  appliedCode?: string | null;
  onRemove?: () => void;
  loading?: boolean;
  error?: string;
}

/** Voucher input + "Pakai" button (Enter applies; no nested <form>); applied state shows a removable tag. */
export function VoucherField({ value, onValueChange, onApply, appliedCode, onRemove, loading, error }: VoucherFieldProps) {
  const t = useTranslations("common");
  const apply = () => {
    if (value.trim()) onApply(value.trim().toUpperCase());
  };
  if (appliedCode) {
    return (
      <div className="flex items-center justify-between gap-2 rounded-sm bg-success-bg px-3 py-2 text-sm text-success">
        <span className="flex items-center gap-2">
          <Tag size={16} strokeWidth={1.5} aria-hidden />
          {t("summary.voucherApplied", { code: appliedCode })}
        </span>
        {onRemove ? (
          <button type="button" onClick={onRemove} aria-label={t("summary.voucherRemove")} className="inline-flex size-11 items-center justify-center rounded-sm text-ink-muted hover:text-ink -my-2 -mr-2">
            <X size={16} strokeWidth={1.5} aria-hidden />
          </button>
        ) : null}
      </div>
    );
  }
  return (
    <div className="flex items-start gap-2">
      <Input
        aria-label={t("summary.voucher")}
        placeholder={t("summary.voucher")}
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            apply();
          }
        }}
        error={error}
        autoCapitalize="characters"
        wrapperClassName="flex-1"
        className="uppercase"
      />
      <Button variant="secondary" loading={loading} disabled={!value.trim()} onClick={apply}>
        {t("summary.voucherApply")}
      </Button>
    </div>
  );
}
