"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Button, CopyButton, Tabs } from "@/components/ui";
import {
  AvailabilityLine,
  CartLine,
  Price,
  ProductCard,
  SizeSelector,
  StockBadge,
  WhatsAppButton,
  Wordmark,
} from "@/components/store";
import { CardForm, Countdown, EwalletPanel, OrderTimeline, PaymentStatus, QRISPanel, VAPanel } from "@/components/checkout";
import { formatIDR } from "@/lib/format";
import type { StockStatus } from "@/lib/contracts";
import type { ShowcaseData } from "./mock-data";
import { Group, PhoneFrame, Specimen } from "./frame";
import { WA_DEMO } from "./store-section";

const STATUSES: StockStatus[] = ["READY", "LOW", "PREORDER", "SOLD_OUT"];

export function Patterns({ data, nowMs }: { data: ShowcaseData; nowMs: number }) {
  const t = useTranslations("designSystem");
  const tc = useTranslations("common");
  const total = 2_143_000;

  const payHeader = (
    <div className="flex items-center justify-between border-b border-border pb-3">
      <Wordmark size="sm" compact />
      <WhatsAppButton href={WA_DEMO} variant="link" label={tc("wa.help")} className="text-xs" />
    </div>
  );
  const orderLine = (
    <div className="flex items-center justify-between gap-2">
      <div className="flex flex-col">
        <span className="eyebrow text-ink-muted">{t("patterns.pay.orderNo")}</span>
        <span className="tabular font-mono text-sm">RLV-261105-0042</span>
      </div>
      <CopyButton value="RLV-261105-0042" />
    </div>
  );
  const paid = (
    <>
      {payHeader}
      <PaymentStatus status="paid" />
      <div className="flex items-center justify-between rounded-md bg-surface-alt px-4 py-3 text-sm">
        <span className="text-ink-muted">{t("patterns.pay.paidTotal")}</span>
        <span className="tabular font-semibold">{formatIDR(total)}</span>
      </div>
      <OrderTimeline entries={data.timeline.map((e, i) => ({ ...e, done: i < 2, at: i < 2 ? e.at : null }))} />
      <Button fullWidth>{t("checkout.pay.track")}</Button>
    </>
  );
  const expired = (
    <>
      {payHeader}
      {orderLine}
      <PaymentStatus status="expired" actions={<Button fullWidth>{t("checkout.pay.orderAgain")}</Button>} />
      <Countdown expiresAt={nowMs - 60_000} />
    </>
  );
  const waiting = (panel: React.ReactNode) => (
    <>
      {payHeader}
      {orderLine}
      <PaymentStatus status="waiting" appearance="compact" className="self-start" />
      {panel}
    </>
  );
  const methods = [
    { value: "qris", label: "QRIS", panel: <QRISPanel qrString={data.qrString} amountIdr={total} expiresAt={nowMs + 26 * 60_000} /> },
    { value: "va", label: "Virtual Account", panel: <VAPanel bank="MANDIRI" vaNumber="8900801200457123" amountIdr={total} expiresAt={nowMs + 22 * 3_600_000} /> },
    { value: "ewallet", label: "E-wallet", panel: <EwalletPanel wallet="SHOPEEPAY" redirectUrl="#shopeepay" amountIdr={total} expiresAt={nowMs + 3 * 60_000 + 40_000} /> },
    { value: "card", label: tc("payment.groups.CARD"), panel: <CardForm amountIdr={total} onSubmit={() => {}} /> },
  ];

  return (
    <>
      <Group title={t("patterns.stock.title")} description={t("patterns.stock.description")}>
        <div className="grid grid-cols-2 gap-x-4 gap-y-10 md:gap-x-6 lg:grid-cols-4 lg:gap-x-8">
          {data.stockCards.map((p) => (
            <ProductCard key={p.slug} product={p} href={`#${p.slug}`} lowStockCount={p.status === "LOW" ? 2 : undefined} />
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {STATUSES.map((s) => (
            <Specimen key={s} label={`PDP · ${s}`}>
              <div className="flex flex-col gap-4">
                <StockBadge status={s} available={2} leadWeeks="4-6" appearance="inline" />
                <AvailabilityLine status={s} available={2} leadWeeks="4-6" />
                {s === "SOLD_OUT" ? (
                  <WhatsAppButton href={WA_DEMO} label={tc("wa.notifyMe")} fullWidth />
                ) : (
                  <Button fullWidth>{s === "PREORDER" ? t("store.picker.preorderCta") : t("primitives.button.addToCart")}</Button>
                )}
              </div>
            </Specimen>
          ))}
        </div>
        <Specimen label={t("patterns.stock.chips")} code="READY · LOW (dot) · PREORDER (PO) · SOLD_OUT (struck, aria-disabled) · n/a (disabled)">
          <SizeSelector
            value="7.5L (adult)"
            onChange={() => {}}
            onSizeGuide={() => {}}
            options={[
              { value: "6L (adult)", status: "READY", available: 8 },
              { value: "6.5L (adult)", status: "LOW", available: 2 },
              { value: "7L (adult)", status: "PREORDER", leadWeeks: "4-6" },
              { value: "7.5L (adult)", status: "READY", available: 5 },
              { value: "8L (adult)", status: "SOLD_OUT", available: 0 },
              { value: "8.5L (adult)", status: null },
              { value: "9L (adult)", status: "LOW", available: 1 },
            ]}
          />
        </Specimen>
      </Group>

      <Group title={t("patterns.price.title")} description={t("patterns.price.description")}>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Specimen label={t("patterns.price.card")}>
            <Price value={675000} size="sm" />
          </Specimen>
          <Specimen label={t("patterns.price.pdp")}>
            <Price value={2790000} size="lg" />
          </Specimen>
          <Specimen label={t("patterns.price.listingFrom")}>
            <Price value={3005000} from />
          </Specimen>
          <Specimen label={t("patterns.price.total")}>
            <div className="flex items-baseline justify-between">
              <span className="eyebrow">{tc("summary.total")}</span>
              <Price value={total} size="xl" />
            </div>
          </Specimen>
        </div>
        <Specimen label={t("patterns.price.cartLine")}>
          <CartLine line={{ ...data.cart[1], qty: 2 }} onQtyChange={() => {}} onRemove={() => {}} />
        </Specimen>
      </Group>

      <Group title={t("patterns.wa.title")} description={t("patterns.wa.description")}>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Specimen label={t("patterns.wa.pdp")}>
            <WhatsAppButton href={WA_DEMO} fullWidth />
          </Specimen>
          <Specimen label={t("patterns.wa.soldOut")}>
            <WhatsAppButton href={WA_DEMO} label={tc("wa.notifyMe")} fullWidth />
          </Specimen>
          <Specimen label={t("patterns.wa.sizeGuide")}>
            <WhatsAppButton href={WA_DEMO} label={tc("wa.sizeConsult")} fullWidth />
          </Specimen>
          <Specimen label={t("patterns.wa.cart")}>
            <WhatsAppButton href={WA_DEMO} variant="link" />
          </Specimen>
          <Specimen label={t("patterns.wa.checkout")}>
            <WhatsAppButton href={WA_DEMO} variant="link" label={tc("address.outsideJava")} />
          </Specimen>
          <Specimen label={t("patterns.wa.pay")}>
            <div className="flex flex-col items-start gap-2">
              <WhatsAppButton href={WA_DEMO} variant="link" label={tc("wa.help")} />
              <WhatsAppButton href={WA_DEMO} variant="inline" size="sm" label={t("patterns.wa.sendInstructions")} />
            </div>
          </Specimen>
          <Specimen label={t("patterns.wa.order")}>
            <WhatsAppButton href={WA_DEMO} variant="inline" size="sm" label={tc("wa.askOrder")} />
          </Specimen>
          <Specimen label={t("patterns.wa.fab")} code='variant="fab" (fixed bottom-right)' bodyClassName="flex min-h-28 items-end justify-end bg-surface-alt">
            <WhatsAppButton href={WA_DEMO} variant="fab" className="static shadow-none md:static" />
          </Specimen>
        </div>
        <p className="text-sm text-ink-muted">{t("patterns.wa.rule")}</p>
      </Group>

      <Group id="payment-pages" title={t("patterns.pay.title")} description={t("patterns.pay.description")}>
        <Tabs
          label={t("patterns.pay.title")}
          variant="pill"
          items={methods.map((m) => ({
            value: m.value,
            label: m.label,
            content: (
              <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                <PhoneFrame label={t("patterns.pay.waiting")}>{waiting(m.panel)}</PhoneFrame>
                <PhoneFrame label={t("patterns.pay.paid")}>{paid}</PhoneFrame>
                <PhoneFrame label={t("patterns.pay.expired")}>{expired}</PhoneFrame>
              </div>
            ),
          }))}
        />
      </Group>
    </>
  );
}
