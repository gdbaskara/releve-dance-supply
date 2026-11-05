"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { ShoppingBag } from "lucide-react";
import type { CartLineView } from "@/lib/contracts";
import { formatIDR } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { Notice, type NoticeTone } from "@/components/ui/notice";
import { CartLine } from "./cart-line";
import { EmptyState } from "./empty-state";
import { WhatsAppButton } from "./whatsapp-button";

export interface CartDrawerNotice {
  tone: NoticeTone;
  message: React.ReactNode;
}

export interface CartDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lines: CartLineView[];
  subtotalIdr: number;
  /** Already-translated notices (stock changed, mixed pre-order…). Mixed pre-order is added automatically. */
  notices?: CartDrawerNotice[];
  onQtyChange?: (sku: string, qty: number) => void;
  onRemove?: (sku: string) => void;
  /** Checkout URL (rendered as link) — or use onCheckout. */
  checkoutHref?: string;
  onCheckout?: () => void;
  /** wa.me link with cart context (secondary). */
  waHref?: string;
  /** "Lanjut belanja" target for the empty state. */
  continueHref?: string;
  /** PDP href per line. */
  lineHref?: (line: CartLineView) => string;
  linkAs?: React.ElementType;
  loading?: boolean;
}

/** Presentational cart drawer: right on desktop (420px), bottom sheet on mobile. */
export function CartDrawer({
  open,
  onOpenChange,
  lines,
  subtotalIdr,
  notices = [],
  onQtyChange,
  onRemove,
  checkoutHref,
  onCheckout,
  waHref,
  continueHref,
  lineHref,
  linkAs: LinkComp = "a",
  loading,
}: CartDrawerProps) {
  const t = useTranslations("common");
  const count = lines.reduce((n, l) => n + l.qty, 0);
  const hasPreorder = lines.some((l) => l.isPreorder);
  const hasReady = lines.some((l) => !l.isPreorder);
  const allNotices = [...notices, ...(hasPreorder && hasReady ? [{ tone: "info" as const, message: t("cartDrawer.mixedPreorder") }] : [])];

  const footer =
    lines.length > 0 ? (
      <div className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between">
          <span className="eyebrow text-ink-muted">{t("summary.subtotal")}</span>
          <span className="tabular text-xl font-semibold">{formatIDR(subtotalIdr)}</span>
        </div>
        <p className="-mt-2 text-xs text-ink-muted">{t("cartDrawer.shippingNote")}</p>
        {checkoutHref ? (
          <Button asChild fullWidth>
            <LinkComp href={checkoutHref}>{t("cartDrawer.checkout")}</LinkComp>
          </Button>
        ) : (
          <Button fullWidth onClick={onCheckout} loading={loading}>
            {t("cartDrawer.checkout")}
          </Button>
        )}
        {waHref ? <WhatsAppButton href={waHref} variant="link" className="self-center" /> : null}
      </div>
    ) : undefined;

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent title={t("cartDrawer.title", { n: count })} footer={footer}>
        {lines.length === 0 ? (
          <EmptyState
            icon={<ShoppingBag size={40} strokeWidth={1} />}
            title={t("cartDrawer.empty")}
            description={t("cartDrawer.emptyBody")}
            actions={
              continueHref ? (
                <Button asChild variant="secondary">
                  <LinkComp href={continueHref}>{t("empty.continue")}</LinkComp>
                </Button>
              ) : (
                <Button variant="secondary" onClick={() => onOpenChange(false)}>
                  {t("empty.continue")}
                </Button>
              )
            }
          />
        ) : (
          <div className="flex flex-col gap-4">
            {allNotices.map((n, i) => (
              <Notice key={i} tone={n.tone}>
                {n.message}
              </Notice>
            ))}
            <ul className="-my-4 divide-y divide-border">
              {lines.map((l) => (
                <li key={l.sku}>
                  <CartLine line={l} onQtyChange={onQtyChange} onRemove={onRemove} href={lineHref?.(l)} linkAs={LinkComp} />
                </li>
              ))}
            </ul>
          </div>
        )}
      </DrawerContent>
    </Drawer>
  );
}
