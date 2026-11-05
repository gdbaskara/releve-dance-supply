"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { ShieldCheck } from "lucide-react";
import { Link, useRouter } from "@/i18n/navigation";
import {
  changePaymentMethodAction,
  completeMockPaymentAction,
  getOrderStatusAction,
  sendPaymentInstructionsAction,
} from "@/lib/actions/checkout";
import { formatIDR } from "@/lib/format";
import { buildWaLink } from "@/lib/wa";
import type { EwalletChannel, Locale, OrderPublicView, OrderStatus, VaChannel } from "@/lib/contracts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Notice } from "@/components/ui/notice";
import { useToast } from "@/components/ui/toast";
import { LogoTile } from "@/components/store/logo-tile";
import { WhatsAppButton, WhatsAppIcon } from "@/components/store/whatsapp-button";
import { CardForm, detectCardBrand } from "../card-form";
import { Countdown } from "../countdown";
import { DemoPaymentControls } from "../demo-payment-controls";
import { EwalletPanel } from "../ewallet-panel";
import { OrderSummary } from "../order-summary";
import { PaymentMethodGroup, type PaymentSelection } from "../payment-method";
import { PaymentStatus } from "../payment-status";
import { QRISPanel } from "../qris-panel";
import { VAPanel } from "../va-panel";

type Payment = NonNullable<OrderPublicView["payment"]>;

const PAID_LIKE: OrderStatus[] = ["PAID", "PROCESSING", "SHIPPED", "DELIVERED", "REFUND_PENDING"];
const POLL_MS = 5000;

export interface PayViewProps {
  order: OrderPublicView;
  locale: Locale;
  /** DEMO_MODE (server env) → DemoPaymentControls (PAY-07). */
  demo: boolean;
}

/** PAY-02..10: method panel, countdown, change method, WA instructions, demo controls, 5 s polling. */
export function PayView({ order, locale, demo }: PayViewProps) {
  const t = useTranslations("pay");
  const tc = useTranslations("common");
  const router = useRouter();
  const { toast } = useToast();
  const params = useSearchParams();
  const step = params.get("step");
  const orderNo = order.orderNo;
  const payBase = `/pay/${orderNo}`;

  const [status, setStatus] = React.useState<OrderStatus>(order.status);
  const [payment, setPayment] = React.useState<Payment | null>(order.payment);
  const [changeOpen, setChangeOpen] = React.useState(false);
  const [changeSel, setChangeSel] = React.useState<PaymentSelection | null>(null);
  const [changing, setChanging] = React.useState(false);
  const [sending, setSending] = React.useState(false);
  const [demoLoading, setDemoLoading] = React.useState<"paid" | "expired" | null>(null);
  const [card, setCard] = React.useState<{ number: string } | null>(null);
  const [cardError, setCardError] = React.useState<string | undefined>();
  const [completing, setCompleting] = React.useState(false);
  const [otp, setOtp] = React.useState("");
  const [otpError, setOtpError] = React.useState<string | undefined>();
  const [ewalletError, setEwalletError] = React.useState<string | undefined>();

  const goSuccess = React.useCallback(() => router.replace(`/success/${orderNo}`), [router, orderNo]);
  const setStep = (s: "ewallet" | "3ds" | null) => {
    const url = s ? `?step=${s}` : window.location.pathname;
    window.history.pushState(null, "", url);
  };

  // Polling (PAY-06)

  const refresh = React.useCallback(async () => {
    // A poll can be aborted by navigation / a redeploy — the next tick retries.
    const s = await getOrderStatusAction(orderNo).catch(() => null);
    if (!s) return;
    if (PAID_LIKE.includes(s.status)) {
      goSuccess();
      return;
    }
    setStatus(s.status);
    if (s.payment) setPayment(s.payment);
  }, [orderNo, goSuccess]);

  React.useEffect(() => {
    if (status !== "PENDING_PAYMENT") return;
    const id = setInterval(() => void refresh(), POLL_MS);
    return () => clearInterval(id);
  }, [status, refresh]);

  // Actions

  const changeMethod = async (sel: PaymentSelection, opts: { silent?: boolean } = {}) => {
    const res = await changePaymentMethodAction(orderNo, sel.method, sel.channel);
    if (res.ok) {
      setPayment(res.payment);
      setCardError(undefined);
      setEwalletError(undefined);
      if (!opts.silent) toast({ title: t("changed"), variant: "success" });
      return true;
    }
    if (res.error === "NOT_PENDING") await refresh();
    else toast({ title: t("changeError"), variant: "error" });
    return false;
  };

  const confirmChange = async () => {
    if (!changeSel) return;
    setChanging(true);
    const ok = await changeMethod(changeSel);
    setChanging(false);
    if (ok) {
      setChangeOpen(false);
      setCard(null);
      setStep(null);
    }
  };

  const renew = async () => {
    if (!payment) return;
    const ok = await changeMethod({ method: payment.method, channel: payment.channel }, { silent: true });
    if (ok) toast({ title: t("renewed"), variant: "success" });
  };

  const sendInstructions = async () => {
    setSending(true);
    const res = await sendPaymentInstructionsAction(orderNo);
    setSending(false);
    if (res.ok) toast({ title: t("sent"), variant: "success" });
    else toast({ title: t(`sendErrors.${res.error}`), variant: "error" });
  };

  const simulate = async (outcome: "PAID" | "EXPIRED") => {
    setDemoLoading(outcome === "PAID" ? "paid" : "expired");
    try {
      const res = await fetch("/api/demo/simulate-payment", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ orderNo, outcome }),
      });
      if (!res.ok && res.status !== 409) throw new Error(String(res.status));
      await refresh();
    } catch {
      toast({ title: t("demoError"), variant: "error" });
    } finally {
      setDemoLoading(null);
    }
  };

  const completeEwallet = async () => {
    setCompleting(true);
    setEwalletError(undefined);
    const res = await completeMockPaymentAction(orderNo);
    if (res.ok && (res.orderStatus === undefined || PAID_LIKE.includes(res.orderStatus))) {
      goSuccess();
      return;
    }
    setCompleting(false);
    setEwalletError(t("ewalletError"));
    await refresh();
  };

  const submitCard = async (number: string) => {
    setCardError(undefined);
    // After a declined card the old payment is FAILED → create a fresh CARD payment first (PAY-10 path).
    if (payment && payment.status !== "PENDING") {
      setCompleting(true);
      const ok = await changeMethod({ method: "CARD" }, { silent: true });
      setCompleting(false);
      if (!ok) return;
    }
    setCard({ number });
    setOtp("");
    setOtpError(undefined);
    setStep("3ds");
  };

  const verify3ds = async () => {
    if (!/^\d{6}$/.test(otp)) {
      setOtpError(t("threeDs.otpInvalid"));
      return;
    }
    if (!card) return;
    setCompleting(true);
    const res = await completeMockPaymentAction(orderNo, { cardNumber: card.number });
    if (res.ok && res.orderStatus && PAID_LIKE.includes(res.orderStatus)) {
      goSuccess();
      return;
    }
    setCompleting(false);
    await refresh();
    setCard(null);
    setStep(null);
    setCardError(res.ok ? t("cardFailed") : t("cardError"));
  };

  // Terminal states

  const waOrderHref = buildWaLink("order", { orderNo }, locale);

  if (status === "EXPIRED" || status === "CANCELLED") {
    const expired = status === "EXPIRED";
    return (
      <Shell>
        <OrderHeader orderNo={orderNo} totalIdr={order.totalIdr} />
        <PaymentStatus
          status="expired"
          title={expired ? undefined : t("cancelled.title")}
          description={expired ? undefined : t("cancelled.body")}
          className="py-6"
          actions={
            <>
              {expired ? (
                <p className="flex justify-center">
                  <Badge variant="warning">{t("expired.stockReleased")}</Badge>
                </p>
              ) : null}
              <Button asChild fullWidth>
                <Link href="/">{t("expired.orderAgain")}</Link>
              </Button>
              <WhatsAppButton href={waOrderHref} label={tc("wa.askOrder")} fullWidth />
            </>
          }
        />
      </Shell>
    );
  }

  if (PAID_LIKE.includes(status)) {
    return (
      <Shell>
        <PaymentStatus status="paid" className="py-10" />
      </Shell>
    );
  }

  // Simulated provider screens

  if (payment?.method === "EWALLET" && payment.channel && step === "ewallet" && payment.status === "PENDING") {
    const wallet = tc(`payment.names.${payment.channel}`);
    return (
      <Shell>
        <div className="flex flex-col items-center gap-5 rounded-lg border border-border p-6 text-center">
          <LogoTile code={payment.channel} />
          <h1 className="text-2xl font-semibold">{t("ewallet.screenTitle", { wallet })}</h1>
          <p className="text-sm text-ink-muted">{t("ewallet.simNote", { wallet })}</p>
          <dl className="flex w-full flex-col gap-3 border-y border-border py-4 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-ink-muted">{t("ewallet.merchant")}</dt>
              <dd className="font-medium">{t("ewallet.merchantName")}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-ink-muted">{t("orderNo")}</dt>
              <dd className="tabular font-mono">{orderNo}</dd>
            </div>
            <div className="flex items-baseline justify-between gap-4">
              <dt className="text-ink-muted">{t("total")}</dt>
              <dd className="tabular text-xl font-semibold">{formatIDR(order.totalIdr)}</dd>
            </div>
          </dl>
          <Countdown expiresAt={payment.expiresAt} onExpire={() => void refresh()} onRenew={renew} className="w-full" />
          {ewalletError ? (
            <Notice tone="error" live className="w-full text-left">
              {ewalletError}
            </Notice>
          ) : null}
          <Button fullWidth loading={completing} onClick={completeEwallet}>
            {t("ewallet.confirm", { amount: formatIDR(order.totalIdr) })}
          </Button>
          <Button variant="ghost" fullWidth onClick={() => setStep(null)} disabled={completing}>
            {t("ewallet.cancel")}
          </Button>
        </div>
      </Shell>
    );
  }

  if (payment?.method === "CARD" && step === "3ds" && card) {
    const digits = card.number;
    return (
      <Shell>
        <form
          noValidate
          className="flex flex-col gap-5 rounded-lg border border-border p-6"
          onSubmit={(e) => {
            e.preventDefault();
            void verify3ds();
          }}
        >
          <div className="flex items-center gap-3">
            <span className="inline-flex size-10 items-center justify-center rounded-pill bg-surface-alt">
              <ShieldCheck size={20} strokeWidth={1.5} aria-hidden />
            </span>
            <h1 className="text-xl font-semibold">{t("threeDs.title")}</h1>
          </div>
          <p className="text-sm text-ink-muted">{t("threeDs.body", { amount: formatIDR(order.totalIdr) })}</p>
          <p className="tabular font-mono text-sm">{t("threeDs.card", { brand: detectCardBrand(digits) ?? "", last4: digits.slice(-4) })}</p>
          <Input
            label={t("threeDs.otp")}
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={otp}
            onChange={(e) => {
              setOtp(e.target.value.replace(/\D/g, "").slice(0, 6));
              setOtpError(undefined);
            }}
            helper={t("threeDs.otpHint")}
            error={otpError}
            className="tabular font-mono tracking-[0.3em]"
            autoFocus
          />
          <Button type="submit" fullWidth loading={completing}>
            {t("threeDs.submit")}
          </Button>
          <Button
            type="button"
            variant="ghost"
            fullWidth
            disabled={completing}
            onClick={() => {
              setCard(null);
              setStep(null);
            }}
          >
            {t("threeDs.cancel")}
          </Button>
        </form>
      </Shell>
    );
  }

  // Main pay page

  const failed = payment?.status === "FAILED";
  let panel: React.ReactNode = null;
  if (payment) {
    const onExpire = () => void refresh();
    if (payment.method === "QRIS" && payment.qrString) {
      panel =
        payment.status === "PENDING" ? (
          <QRISPanel qrString={payment.qrString} amountIdr={order.totalIdr} expiresAt={payment.expiresAt} onExpire={onExpire} orderNo={orderNo} />
        ) : (
          <Countdown expiresAt={0} onRenew={renew} />
        );
    } else if (payment.method === "VA" && payment.vaNumber && payment.channel) {
      panel =
        payment.status === "PENDING" ? (
          <VAPanel bank={payment.channel as VaChannel} vaNumber={payment.vaNumber} amountIdr={order.totalIdr} expiresAt={payment.expiresAt} onExpire={onExpire} />
        ) : (
          <Countdown expiresAt={0} onRenew={renew} />
        );
    } else if (payment.method === "EWALLET" && payment.channel) {
      panel =
        payment.status === "PENDING" ? (
          <EwalletPanel
            wallet={payment.channel as EwalletChannel}
            redirectUrl={`/${locale}${payBase}?step=ewallet`}
            amountIdr={order.totalIdr}
            expiresAt={payment.expiresAt}
            onExpire={onExpire}
            onSwitchToQris={() => void changeMethod({ method: "QRIS" })}
          />
        ) : (
          <Countdown expiresAt={0} onRenew={renew} />
        );
    } else if (payment.method === "CARD") {
      panel = (
        <div className="flex flex-col gap-5">
          {payment.status === "PENDING" ? <Countdown expiresAt={payment.expiresAt} onExpire={onExpire} onRenew={renew} /> : null}
          <CardForm
            amountIdr={order.totalIdr}
            loading={completing}
            testCard={demo ? "4811 1111 1111 1114" : ""}
            error={cardError ?? (failed ? t("cardFailed") : undefined)}
            onSubmit={(v) => void submitCard(v.number)}
          />
        </div>
      );
    }
  }

  return (
    <Shell>
      <OrderHeader orderNo={orderNo} totalIdr={order.totalIdr}>
        <PaymentStatus status={failed ? "failed" : "waiting"} appearance="compact" />
      </OrderHeader>

      <section aria-label={payment ? tc(`payment.names.${payment.channel ?? payment.method}`) : undefined} className="rounded-lg border border-border p-5 md:p-6">
        {panel}
      </section>
      <p className="text-center text-xs text-ink-muted">{t("autoUpdate")}</p>

      <div className="flex flex-col gap-3">
        <Button
          variant="secondary"
          fullWidth
          onClick={() => {
            setChangeSel(payment ? { method: payment.method, channel: payment.channel } : null);
            setChangeOpen(true);
          }}
        >
          {t("changeMethod")}
        </Button>
        <Button variant="ghost" fullWidth loading={sending} onClick={sendInstructions} leadingIcon={<WhatsAppIcon size={18} />}>
          {t("sendWa")}
        </Button>
      </div>

      {demo ? <DemoPaymentControls onSimulatePaid={() => void simulate("PAID")} onSimulateExpired={() => void simulate("EXPIRED")} loading={demoLoading} /> : null}

      <OrderSummary
        mode="collapsible"
        items={order.items}
        subtotalIdr={order.subtotalIdr}
        shippingIdr={order.shippingIdr}
        insuranceIdr={order.insuranceIdr}
        discountIdr={order.discountIdr}
        totalIdr={order.totalIdr}
        className="-mx-4 md:mx-0"
      />

      <Dialog open={changeOpen} onOpenChange={setChangeOpen}>
        <DialogContent
          variant="responsive"
          title={t("changeTitle")}
          description={t("changeBody")}
          footer={
            <Button fullWidth loading={changing} disabled={!changeSel} onClick={confirmChange}>
              {t("changeConfirm")}
            </Button>
          }
        >
          <PaymentMethodGroup value={changeSel} onChange={setChangeSel} name="change-payment" />
        </DialogContent>
      </Dialog>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto flex w-full max-w-xl flex-col gap-6 px-4 pb-16 pt-6 md:pt-10">{children}</div>;
}

function OrderHeader({ orderNo, totalIdr, children }: { orderNo: string; totalIdr: number; children?: React.ReactNode }) {
  const t = useTranslations("pay");
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-[30px] font-semibold leading-9 tracking-[-0.01em]">{t("title")}</h1>
      <div className="flex flex-col gap-3 rounded-md bg-surface-alt p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 flex-col">
            <span className="eyebrow text-ink-muted">{t("orderNo")}</span>
            <span className="tabular font-mono text-base font-medium tracking-[0.04em]" data-testid="order-no">
              {orderNo}
            </span>
          </div>
          <CopyButton value={orderNo} ariaLabel={t("copyOrderNo")} />
        </div>
        <div className="flex flex-wrap items-end justify-between gap-3 border-t border-border pt-3">
          <div className="flex flex-col">
            <span className="eyebrow text-ink-muted">{t("total")}</span>
            <span className="tabular whitespace-nowrap text-2xl font-semibold">{formatIDR(totalIdr)}</span>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
