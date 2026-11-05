"use client";
/** /cart (CART-01..06): validated lines, notices, pre-order labels, subtotal, Checkout, WA. */
import * as React from "react";
import { useTranslations } from "next-intl";
import { ShoppingBag } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { formatIDR } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import { Skeleton } from "@/components/ui/skeleton";
import { CartLine } from "@/components/store/cart-line";
import { EmptyState } from "@/components/store/empty-state";
import { WhatsAppButton } from "@/components/store/whatsapp-button";
import { useValidatedCart } from "./use-validated-cart";

export function CartPageView() {
  const t = useTranslations("cart");
  const cart = useValidatedCart(true);

  if (!cart.hydrated) {
    return (
      <div className="flex flex-col gap-4" aria-busy>
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (cart.lines.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        {cart.notices.map((n) => (
          <Notice key={n.key} tone={n.tone}>
            {n.message}
          </Notice>
        ))}
        <EmptyState
          icon={<ShoppingBag size={40} strokeWidth={1} />}
          title={t("emptyTitle")}
          description={t("emptyBody")}
          actions={
            <Button asChild variant="secondary">
              <Link href="/c/shoes">{t("continue")}</Link>
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-12">
      <div className="flex flex-col gap-4">
        <p className="text-sm text-ink-muted" aria-live="polite">
          {cart.validating ? t("validating") : t("count", { n: cart.count })}
        </p>
        {cart.notices.map((n) => (
          <Notice key={n.key} tone={n.tone} live>
            {n.message}
          </Notice>
        ))}
        {cart.hasPreorder ? <Notice tone="info">{t("preorderNotice")}</Notice> : null}
        <ul aria-label={t("itemsLabel")} className="divide-y divide-border border-y border-border">
          {cart.lines.map((l) => (
            <li key={l.sku}>
              <CartLine line={l} onQtyChange={cart.setQty} onRemove={cart.remove} href={`/p/${l.productSlug}`} linkAs={Link} />
            </li>
          ))}
        </ul>
        <Link href="/c/shoes" className="inline-flex min-h-11 items-center self-start text-sm font-medium text-ink underline underline-offset-[3px]">
          {t("continue")}
        </Link>
      </div>
      <aside aria-labelledby="cart-summary" className="flex flex-col gap-4 self-start rounded-md bg-surface-alt p-5 lg:sticky lg:top-[calc(var(--header-h)+1.5rem)]">
        <h2 id="cart-summary" className="eyebrow text-ink">
          {t("summary")}
        </h2>
        <dl className="flex flex-col gap-2 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-ink-muted">{t("subtotal")}</dt>
            <dd className="tabular font-medium">{formatIDR(cart.subtotalIdr)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-ink-muted">{t("shipping")}</dt>
            <dd className="text-ink-muted">{t("shippingAtCheckout")}</dd>
          </div>
          <div className="mt-2 flex items-baseline justify-between gap-4 border-t border-border pt-3">
            <dt className="font-semibold">{t("total")}</dt>
            <dd className="tabular text-xl font-semibold" data-testid="cart-total">
              {formatIDR(cart.subtotalIdr)}
            </dd>
          </div>
        </dl>
        <p className="text-xs text-ink-muted">{t("totalNote")}</p>
        <Button asChild fullWidth aria-disabled={cart.validating || undefined}>
          <Link href="/checkout">{t("checkout")}</Link>
        </Button>
        <WhatsAppButton href={cart.waHref} variant="link" label={t("askWa")} className="self-center" />
        <p className="text-center text-xs text-ink-muted">{t("javaOnly")}</p>
      </aside>
    </div>
  );
}
