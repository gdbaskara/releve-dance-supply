"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui";
import {
  AddressForm,
  CardForm,
  CheckoutStep,
  Countdown,
  CourierOptions,
  DemoPaymentControls,
  EMPTY_ADDRESS,
  EwalletPanel,
  InsuranceToggle,
  OrderSummary,
  OrderTimeline,
  PaymentMethodGroup,
  PaymentStatus,
  PhoneInput,
  QRISPanel,
  StickyPayBar,
  VAPanel,
  VoucherField,
  type AddressValue,
  type PaymentSelection,
} from "@/components/checkout";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { WhatsAppButton } from "@/components/store";
import type { ShowcaseData } from "./mock-data";
import { Group, Specimen } from "./frame";
import { WA_DEMO } from "./store-section";

export function CheckoutSection({ data, nowMs }: { data: ShowcaseData; nowMs: number }) {
  const t = useTranslations("designSystem");
  const tc = useTranslations("common");
  const [phone, setPhone] = React.useState("081234567890");
  const [address, setAddress] = React.useState<AddressValue>({ ...EMPTY_ADDRESS, province: "DKI Jakarta", city: "Kota Jakarta Selatan" });
  const [courier, setCourier] = React.useState<string | null>("jne_yes");
  const [insured, setInsured] = React.useState(true);
  const [pay, setPay] = React.useState<PaymentSelection | null>({ method: "QRIS" });
  const [voucher, setVoucher] = React.useState("");
  const [applied, setApplied] = React.useState<string | null>(null);
  const [step, setStep] = React.useState(2);
  const [demoLoading, setDemoLoading] = React.useState<"paid" | "expired" | null>(null);
  const [expiredMsg, setExpiredMsg] = React.useState(false);

  const rate = data.rates.find((r) => r.serviceCode === courier) ?? null;
  const subtotal = data.cart.reduce((n, l) => n + l.priceIdr * l.qty, 0);
  const shipping = rate?.priceIdr ?? null;
  const insurance = insured && rate ? rate.insuranceIdr : 0;
  const discount = applied ? Math.round(subtotal * 0.1) : 0;
  const total = subtotal + (shipping ?? 0) + insurance - discount;
  const items = data.cart.map((l) => ({ name: l.name, variantLabel: l.variantLabel, qty: l.qty, priceIdr: l.priceIdr, imageUrl: l.imageUrl, isPreorder: l.isPreorder }));

  const simulate = (k: "paid" | "expired") => {
    setDemoLoading(k);
    setTimeout(() => setDemoLoading(null), 900);
  };

  return (
    <>
      <Group title={t("checkout.flow.title")} description={t("checkout.flow.description")}>
        <div className="grid gap-8 lg:grid-cols-[1fr_380px] lg:gap-12">
          <div className="flex min-w-0 flex-col">
            <CheckoutStep
              number={1}
              title={t("checkout.flow.step1")}
              status={step === 1 ? "active" : "done"}
              summary={`Rina Wijaya · +62 812-3456-7890 · ${address.city || "—"}`}
              onEdit={() => setStep(1)}
              footer={
                <Button className="self-start" onClick={() => setStep(2)}>
                  {tc("continue")}
                </Button>
              }
            >
              <Input label={t("checkout.flow.name")} defaultValue="Rina Wijaya" autoComplete="name" />
              <PhoneInput value={phone} onValueChange={(c) => setPhone(c.local)} />
              <Input label={t("checkout.flow.email")} optional type="email" autoComplete="email" />
              <Checkbox defaultChecked label={t("checkout.flow.waOptIn")} />
              <AddressForm provinces={data.provinces} value={address} onChange={setAddress} outsideJavaHref={WA_DEMO} />
            </CheckoutStep>
            <CheckoutStep
              number={2}
              title={t("checkout.flow.step2")}
              status={step === 2 ? "active" : step > 2 ? "done" : "locked"}
              summary={rate ? `${rate.courier} ${rate.service}` : undefined}
              onEdit={() => setStep(2)}
              footer={
                <Button className="self-start" onClick={() => setStep(3)}>
                  {tc("continue")}
                </Button>
              }
            >
              <CourierOptions rates={data.rates} value={courier} onChange={setCourier} />
              {rate ? <InsuranceToggle checked={insured} onCheckedChange={setInsured} amountIdr={rate.insuranceIdr} /> : null}
            </CheckoutStep>
            <CheckoutStep number={3} title={t("checkout.flow.step3")} status={step === 3 ? "active" : "locked"}>
              <PaymentMethodGroup value={pay} onChange={setPay} />
            </CheckoutStep>
            <div className="flex flex-col gap-3 pt-6">
              <span className="eyebrow text-ink-muted">{t("checkout.flow.loading")}</span>
              <CourierOptions rates={[]} value={null} onChange={() => {}} loading />
            </div>
          </div>
          <div className="flex min-w-0 flex-col gap-6">
            <OrderSummary
              mode="responsive"
              items={items}
              subtotalIdr={subtotal}
              shippingIdr={shipping}
              insuranceIdr={insurance}
              discountIdr={discount}
              totalIdr={total}
              voucher={
                <VoucherField
                  value={voucher}
                  onValueChange={setVoucher}
                  onApply={(c) => setApplied(c)}
                  appliedCode={applied}
                  onRemove={() => {
                    setApplied(null);
                    setVoucher("");
                  }}
                />
              }
            />
            <Button fullWidth className="hidden lg:inline-flex">
              {tc("payBar.payNow")}
            </Button>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Specimen label={t("checkout.flow.collapsed")} bodyClassName="p-0">
            <OrderSummary mode="collapsible" items={items} subtotalIdr={subtotal} shippingIdr={null} totalIdr={subtotal} />
          </Specimen>
          <Specimen label="StickyPayBar" code="fixed bottom · lg:hidden" bodyClassName="p-0">
            <StickyPayBar totalIdr={total} mobileOnly={false} className="static" />
          </Specimen>
        </div>
      </Group>

      <Group title={t("checkout.pay.title")} description={t("checkout.pay.description")}>
        <div className="grid gap-4 md:grid-cols-3">
          <Specimen label={t("checkout.pay.countdownNormal")}>
            <Countdown expiresAt={nowMs + 24 * 60_000 + 30_000} />
          </Specimen>
          <Specimen label={t("checkout.pay.countdownWarning")}>
            <Countdown expiresAt={nowMs + 4 * 60_000 + 12_000} />
          </Specimen>
          <Specimen label={t("checkout.pay.countdownExpired")}>
            <Countdown expiresAt={nowMs - 1000} onRenew={() => setExpiredMsg(true)} />
            {expiredMsg ? <p className="mt-2 text-xs text-ink-muted">{t("checkout.pay.renewClicked")}</p> : null}
          </Specimen>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Specimen label="QRISPanel">
            <QRISPanel qrString={data.qrString} amountIdr={total} expiresAt={nowMs + 28 * 60_000} orderNo="RLV-261105-0042" />
          </Specimen>
          <Specimen label="VAPanel">
            <VAPanel bank="BCA" vaNumber={data.vaNumber} amountIdr={total} expiresAt={nowMs + 23 * 3_600_000} />
          </Specimen>
          <Specimen label="EwalletPanel">
            <EwalletPanel wallet="GOPAY" redirectUrl="#gopay" amountIdr={total} expiresAt={nowMs + 12 * 60_000} onSwitchToQris={() => {}} />
          </Specimen>
          <Specimen label="CardForm">
            <CardForm amountIdr={total} onSubmit={() => {}} />
          </Specimen>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {(["waiting", "paid", "expired", "failed"] as const).map((s) => (
            <Specimen key={s} label={`PaymentStatus · ${s}`}>
              <PaymentStatus
                status={s}
                actions={
                  s === "paid" ? (
                    <Button variant="secondary" size="sm">{t("checkout.pay.track")}</Button>
                  ) : s === "expired" ? (
                    <Button size="sm">{t("checkout.pay.orderAgain")}</Button>
                  ) : s === "failed" ? (
                    <Button variant="secondary" size="sm">{t("checkout.pay.changeMethod")}</Button>
                  ) : undefined
                }
              />
            </Specimen>
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <Specimen label="DemoPaymentControls" code="render only when DEMO_MODE">
            <div className="flex flex-col gap-4">
              <PaymentStatus status="waiting" appearance="compact" />
              <DemoPaymentControls onSimulatePaid={() => simulate("paid")} onSimulateExpired={() => simulate("expired")} loading={demoLoading} />
            </div>
          </Specimen>
          <Specimen label="OrderTimeline">
            <OrderTimeline entries={data.timeline} tracking={{ courier: "JNE", awb: "JNE0123456789012" }} />
            <div className="mt-6">
              <WhatsAppButton href={WA_DEMO} variant="link" label={tc("wa.askOrder")} />
            </div>
          </Specimen>
        </div>
      </Group>
    </>
  );
}
