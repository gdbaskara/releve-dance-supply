"use client";

import * as React from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { Lock, ShoppingBag } from "lucide-react";
import { Link, useRouter } from "@/i18n/navigation";
import { useCart, toCartInput, type CartItem } from "@/lib/cart/store";
import {
  applyVoucherAction,
  createOrderAction,
  getShippingRatesAction,
  resolveCheckoutLinkAction,
} from "@/lib/actions/checkout";
import { validateCartAction } from "@/lib/actions/storefront";
import { JAVA_AREAS, isJavaProvince, resolveZone } from "@/lib/data/areas";
import { formatIDR, formatPhoneID, normalizePhoneID } from "@/lib/format";
import { buildWaLink } from "@/lib/wa";
import type {
  CartLineView,
  CartNotice,
  CreateOrderInput,
  JavaProvince,
  Locale,
  ShippingRate,
  ShippingZone,
  ValidatedCart,
} from "@/lib/contracts";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Notice } from "@/components/ui/notice";
import { Spinner } from "@/components/ui/spinner";
import { linkStyles } from "@/components/ui/link";
import { useToast } from "@/components/ui/toast";
import { EmptyState } from "@/components/store/empty-state";
import { WhatsAppButton } from "@/components/store/whatsapp-button";
import { CheckoutStep, type CheckoutStepStatus } from "../checkout-step";
import { PhoneInput } from "../phone-input";
import { AddressForm, EMPTY_ADDRESS, type AddressErrors, type AddressValue } from "../address-form";
import { CourierOptions } from "../courier-options";
import { InsuranceToggle } from "../insurance-toggle";
import { PaymentMethodGroup, paymentKey, parsePaymentKey } from "../payment-method";
import { OrderSummary, VoucherField } from "../order-summary";
import { StickyPayBar } from "../sticky-pay-bar";
import { dashRange, lineToCartItem, useCartHydrated, useMediaQuery } from "./use-checkout-helpers";

// Form schema (messages are i18n keys under checkout.errors)

const formSchema = z.object({
  name: z.string().trim().min(2, "name").max(100, "name"),
  wa: z.string().refine((v) => normalizePhoneID(v) !== null, "wa"),
  email: z
    .string()
    .trim()
    .max(200, "email")
    .refine((v) => v === "" || z.email().safeParse(v).success, "email"),
  waOptIn: z.boolean(),
  address: z
    .object({
      province: z.string().refine((v: string): boolean => isJavaProvince(v), "province"),
      city: z.string().min(1, "city"),
      district: z.string().trim().min(1, "district").max(100, "district"),
      postalCode: z.string().regex(/^\d{5}$/, "postalCode"),
      line: z.string().trim().min(5, "line").max(300, "line"),
      note: z.string().max(200),
    })
    .superRefine((a, ctx) => {
      if (a.city && isJavaProvince(a.province) && !resolveZone(a.province, a.city)) ctx.addIssue({ code: "custom", path: ["city"], message: "city" });
    }),
  shippingServiceCode: z.string().min(1, "courier"),
  insured: z.boolean(),
  payment: z.string().min(1, "payment"),
});
type FormValues = z.infer<typeof formSchema>;

const STEP_FIELDS = {
  1: ["name", "wa", "email", "waOptIn", "address"],
  2: ["shippingServiceCode", "insured"],
  3: ["payment"],
} as const satisfies Record<number, readonly (keyof FormValues)[]>;

type Step = 1 | 2 | 3;
type Phase = "loading" | "ready" | "empty" | "linkExpired";
type RatesState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "ready"; rates: ShippingRate[]; zone: ShippingZone; billableKg: number }
  | { kind: "error"; reason: "OUTSIDE_JAVA" | "UNKNOWN_CITY" | "OTHER" };

type SubmitError =
  | { kind: "OUT_OF_STOCK"; skus: string[] }
  | { kind: "INVALID_INPUT" | "INVALID_VOUCHER" | "INVALID_SHIPPING" | "OUTSIDE_JAVA" | "RATE_LIMITED" | "generic" };

export interface CheckoutFormProps {
  locale: Locale;
  /** `?link=<token>` from an admin checkout link (CHK-10). */
  linkToken?: string | null;
}

const FORM_ID = "checkout-form";

/** CHK-01..10: one page, three steps, server-side totals. */
export function CheckoutForm({ locale, linkToken }: CheckoutFormProps) {
  const t = useTranslations("checkout");
  const tc = useTranslations("common");
  const router = useRouter();
  const { toast } = useToast();
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const hydrated = useCartHydrated();
  const replaceAll = useCart((s) => s.replaceAll);
  const clearCart = useCart((s) => s.clear);

  const [phase, setPhase] = React.useState<Phase>("loading");
  const [lines, setLines] = React.useState<CartLineView[]>([]);
  const [notices, setNotices] = React.useState<string[]>([]);
  const [link, setLink] = React.useState<{ token: string } | null>(null);
  const [active, setActive] = React.useState<Step>(1);
  const [reached, setReached] = React.useState<Step>(1);
  const [rates, setRates] = React.useState<RatesState>({ kind: "idle" });
  const [ratesNonce, setRatesNonce] = React.useState(0);
  const [voucherInput, setVoucherInput] = React.useState("");
  const [voucher, setVoucher] = React.useState<{ code: string; discountIdr: number } | null>(null);
  const [voucherError, setVoucherError] = React.useState<string | undefined>();
  const [voucherLoading, setVoucherLoading] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [submitError, setSubmitError] = React.useState<SubmitError | null>(null);
  const [refreshing, setRefreshing] = React.useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    mode: "onTouched",
    defaultValues: {
      name: "",
      wa: "",
      email: "",
      waOptIn: true,
      address: { ...EMPTY_ADDRESS },
      shippingServiceCode: "",
      insured: true,
      payment: paymentKey({ method: "QRIS" }),
    },
  });
  const { control, register, trigger, setValue, getValues, formState, handleSubmit } = form;
  const errors = formState.errors;
  const address = useWatch({ control, name: "address" });
  const shippingCode = useWatch({ control, name: "shippingServiceCode" });
  const insured = useWatch({ control, name: "insured" });
  const paymentValue = useWatch({ control, name: "payment" });

  const items = React.useMemo(() => lines.map((l) => ({ sku: l.sku, qty: l.qty })), [lines]);
  const itemsKey = items.map((i) => `${i.sku}:${i.qty}`).join(",");
  const lineName = React.useCallback(
    (sku: string) => {
      const l = lines.find((x) => x.sku === sku);
      return l ? `${l.name} (${l.variantLabel})` : sku;
    },
    [lines],
  );

  // Load: cart (validated) or checkout link

  const noticeText = React.useCallback(
    (n: CartNotice, ls: CartLineView[], before: { sku: string; name: string; variantLabel: string }[]) => {
      const src = ls.find((l) => l.sku === n.sku) ?? before.find((l) => l.sku === n.sku);
      const item = src ? `${src.name} (${src.variantLabel})` : n.sku;
      if (n.type === "QTY_REDUCED") return t("notices.QTY_REDUCED", { item, to: n.to });
      if (n.type === "REMOVED_SOLD_OUT") return t("notices.REMOVED_SOLD_OUT", { item });
      if (n.type === "NOW_PREORDER") return t("notices.NOW_PREORDER", { item });
      return t("notices.UNKNOWN_SKU");
    },
    [t],
  );

  const applyValidated = React.useCallback((v: ValidatedCart, current: CartItem[]) => {
    setLines(v.lines);
    setNotices(v.notices.map((n) => noticeText(n, v.lines, current)));
    if (v.notices.length > 0 || v.lines.length !== current.length) replaceAll(v.lines.map(lineToCartItem));
    setPhase(v.lines.length ? "ready" : "empty");
  }, [noticeText, replaceAll]);
  const fetchValidated = () => {
    const current = useCart.getState().items;
    return validateCartAction(toCartInput(current)).then((v) => ({ v, current }));
  };

  const loaded = React.useRef(false);
  React.useEffect(() => {
    if (loaded.current) return;
    if (linkToken) {
      loaded.current = true;
      resolveCheckoutLinkAction(linkToken).then((r) => {
        if (!r.ok || r.cart.lines.length === 0) {
          setPhase("linkExpired");
          return;
        }
        setLink({ token: r.token });
        setLines(r.cart.lines);
        if (r.prefill.name) setValue("name", r.prefill.name);
        if (r.prefill.wa) setValue("wa", r.prefill.wa);
        setPhase("ready");
      });
      return;
    }
    if (!hydrated) return;
    loaded.current = true;
    fetchValidated().then(({ v, current }) => applyValidated(v, current));
  }, [hydrated, linkToken, setValue, applyValidated]);

  // Shipping rates (CHK-04)

  const zone = isJavaProvince(address.province) && address.city ? resolveZone(address.province, address.city) : null;
  const postal = /^\d{5}$/.test(address.postalCode) ? address.postalCode : undefined;
  React.useEffect(() => {
    if (!zone || !itemsKey) return;
    let cancelled = false;
    const run = async () => {
      setRates({ kind: "loading" });
      const res = await getShippingRatesAction({ province: address.province, city: address.city, postalCode: postal }, items);
      if (cancelled) return;
      if (res.ok) {
        setRates({ kind: "ready", rates: res.rates, zone: res.zone, billableKg: res.billableKg });
        const code = getValues("shippingServiceCode");
        if (code && !res.rates.some((r) => r.serviceCode === code)) setValue("shippingServiceCode", "");
      } else {
        setRates({ kind: "error", reason: res.error === "OUTSIDE_JAVA" || res.error === "UNKNOWN_CITY" ? res.error : "OTHER" });
        setValue("shippingServiceCode", "");
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
    // items is derived from itemsKey
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zone, address.province, address.city, postal, itemsKey, ratesNonce, getValues, setValue]);

  const rateList = rates.kind === "ready" && zone ? rates.rates : [];
  const selectedRate = rateList.find((r) => r.serviceCode === shippingCode) ?? null;
  const insuranceIdr = selectedRate && insured ? selectedRate.insuranceIdr : 0;
  const subtotalIdr = lines.reduce((s, l) => s + l.priceIdr * l.qty, 0);
  const discountIdr = voucher?.discountIdr ?? 0;
  const totalIdr = Math.max(0, subtotalIdr + (selectedRate?.priceIdr ?? 0) + insuranceIdr - discountIdr);

  // Voucher (CHK-09)

  const applyVoucher = async (code: string) => {
    setVoucherLoading(true);
    setVoucherError(undefined);
    const res = await applyVoucherAction(code, items);
    setVoucherLoading(false);
    if (res.ok) {
      setVoucher({ code: res.code, discountIdr: res.discountIdr });
      setVoucherInput("");
      toast({ title: t("payment.voucherApplied", { amount: formatIDR(res.discountIdr) }), variant: "success" });
    } else {
      const min = "minSubtotalIdr" in res && res.minSubtotalIdr ? formatIDR(res.minSubtotalIdr) : "";
      setVoucherError(t(`payment.voucherErrors.${res.error}`, { min }));
    }
  };

  // Re-price the voucher whenever the items change (e.g. after "Perbarui keranjang").
  const voucherCode = voucher?.code;
  React.useEffect(() => {
    if (!voucherCode || !itemsKey) return;
    let cancelled = false;
    applyVoucherAction(voucherCode, items).then((res) => {
      if (cancelled) return;
      if (res.ok) setVoucher({ code: res.code, discountIdr: res.discountIdr });
      else {
        setVoucher(null);
        setVoucherError(t(`payment.voucherErrors.${res.error}`, { min: "minSubtotalIdr" in res && res.minSubtotalIdr ? formatIDR(res.minSubtotalIdr) : "" }));
      }
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemsKey]);

  // Steps

  const scrollToStep = (s: Step) => {
    requestAnimationFrame(() => document.getElementById(`checkout-step-${s}`)?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  const scrollToBanner = () => {
    requestAnimationFrame(() => document.getElementById("checkout-banners")?.scrollIntoView({ behavior: "smooth", block: "center" }));
  };

  const goNext = async (from: Step) => {
    const ok = await trigger([...STEP_FIELDS[from]], { shouldFocus: true });
    if (!ok) return;
    const next = (from + 1) as Step;
    setReached((r) => (r < next ? next : r));
    setActive(next);
    scrollToStep(next);
  };

  const status = (n: Step): CheckoutStepStatus => {
    if (n > reached) return "locked";
    if (isDesktop) return "active";
    return n === active ? "active" : "done";
  };

  const firstErrorStep = (e: typeof errors): Step => {
    if (e.name || e.wa || e.email || e.address) return 1;
    if (e.shippingServiceCode) return 2;
    return 3;
  };

  // Submit (CHK-07)

  const onValid = async (v: FormValues) => {
    setSubmitError(null);
    const sel = parsePaymentKey(v.payment);
    const payload: CreateOrderInput = {
      locale,
      contact: { name: v.name.trim(), wa: normalizePhoneID(v.wa) ?? v.wa, email: v.email.trim() || undefined, waOptIn: v.waOptIn },
      address: {
        province: v.address.province as JavaProvince,
        city: v.address.city,
        district: v.address.district.trim(),
        postalCode: v.address.postalCode,
        line: v.address.line.trim(),
        note: v.address.note.trim() || undefined,
      },
      shippingServiceCode: v.shippingServiceCode,
      insured: v.insured,
      method: sel.method,
      channel: sel.channel,
      items,
      voucherCode: voucher?.code,
      checkoutLinkToken: link?.token,
    };
    setSubmitting(true);
    let res: Awaited<ReturnType<typeof createOrderAction>>;
    try {
      res = await createOrderAction(payload);
    } catch {
      setSubmitting(false);
      setSubmitError({ kind: "generic" });
      scrollToBanner();
      return;
    }
    if (res.ok) {
      if (!link) clearCart();
      router.push(`/pay/${res.orderNo}`);
      return;
    }
    setSubmitting(false);
    switch (res.error) {
      case "OUT_OF_STOCK":
        setSubmitError({ kind: "OUT_OF_STOCK", skus: res.skus });
        break;
      case "LINK_EXPIRED":
        setPhase("linkExpired");
        return;
      case "INVALID_SHIPPING":
        setSubmitError({ kind: "INVALID_SHIPPING" });
        setValue("shippingServiceCode", "");
        setRatesNonce((n) => n + 1);
        setActive(2);
        break;
      case "INVALID_VOUCHER":
        setVoucher(null);
        setSubmitError({ kind: "INVALID_VOUCHER" });
        break;
      case "OUTSIDE_JAVA":
      case "RATE_LIMITED":
      case "INVALID_INPUT":
        setSubmitError({ kind: res.error });
        break;
      default:
        setSubmitError({ kind: "generic" });
    }
    scrollToBanner();
  };

  const onInvalid = (e: typeof errors) => {
    const s = firstErrorStep(e);
    setActive(s);
    scrollToStep(s);
  };

  const refreshCart = async () => {
    setRefreshing(true);
    if (link) {
      setRefreshing(false);
      return;
    }
    const { v, current } = await fetchValidated();
    applyValidated(v, current);
    setRefreshing(false);
    setSubmitError(null);
    toast({ title: t("cartUpdated"), variant: "info" });
  };


  if (phase === "loading") {
    return (
      <div className="flex min-h-[50vh] items-center justify-center gap-3 text-sm text-ink-muted" role="status">
        <Spinner size={20} />
        {linkToken ? t("link.loading") : t("loading")}
      </div>
    );
  }
  if (phase === "empty") {
    return (
      <EmptyState
        icon={<ShoppingBag size={40} strokeWidth={1} aria-hidden />}
        title={t("empty.title")}
        description={t("empty.body")}
        actions={
          <Button asChild>
            <Link href="/">{t("empty.cta")}</Link>
          </Button>
        }
        className="py-24"
      />
    );
  }
  if (phase === "linkExpired") {
    return (
      <div className="mx-auto max-w-xl px-4 py-16">
        <Notice tone="warning" title={t("link.expiredTitle")}>
          {t("link.expiredBody")}
        </Notice>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <WhatsAppButton href={buildWaLink("general", undefined, locale)} label={t("link.askWa")} />
          <Button asChild variant="secondary">
            <Link href="/">{t("empty.cta")}</Link>
          </Button>
        </div>
      </div>
    );
  }

  const addressErrors: AddressErrors = Object.fromEntries(
    Object.entries(errors.address ?? {})
      .filter(([, v]) => v && typeof v === "object" && "message" in v && v.message)
      .map(([k, v]) => [k, t(`errors.${(v as { message: string }).message}`)]),
  );
  const err = (m?: string) => (m ? t(`errors.${m}`) : undefined);
  const outsideJavaHref = buildWaLink("outsideJava", { province: undefined }, locale);
  const preorderLine = lines.find((l) => l.isPreorder);
  const oosSkus = submitError?.kind === "OUT_OF_STOCK" ? submitError.skus : [];
  const summaryItems = lines.map((l) => ({
    name: l.name,
    variantLabel: oosSkus.includes(l.sku) ? `${l.variantLabel} · ${t("submitErrors.OUT_OF_STOCK_TITLE")}` : l.variantLabel,
    qty: l.qty,
    priceIdr: l.priceIdr,
    imageUrl: l.imageUrl,
    isPreorder: l.isPreorder,
  }));
  const vals = getValues();
  const waE164 = normalizePhoneID(vals.wa);
  const sel = paymentValue ? parsePaymentKey(paymentValue) : null;

  return (
    <div className="mx-auto max-w-[1280px] px-4 pb-36 pt-0 lg:grid lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-12 lg:px-8 lg:pb-16 lg:pt-10">
      <OrderSummary
        items={summaryItems}
        subtotalIdr={subtotalIdr}
        shippingIdr={selectedRate ? selectedRate.priceIdr : null}
        insuranceIdr={insuranceIdr}
        discountIdr={discountIdr}
        totalIdr={totalIdr}
        className="-mx-4 lg:col-start-2 lg:row-start-1 lg:mx-0"
      />

      <div className="flex min-w-0 flex-col lg:col-start-1 lg:row-start-1">
        <div className="flex flex-col gap-2 pt-6 lg:pt-0">
          <div className="flex items-baseline justify-between gap-4">
            <h1 className="text-[30px] font-semibold leading-9 tracking-[-0.01em] lg:text-[40px] lg:leading-[48px]">{t("title")}</h1>
            {!link ? (
              <Link href="/cart" className={linkStyles({ variant: "subtle" })}>
                {t("editCartHint")}
              </Link>
            ) : null}
          </div>
          <p className="flex items-center gap-2 text-sm text-ink-muted">
            <Lock size={14} strokeWidth={1.5} aria-hidden />
            {t("secure")}
          </p>
        </div>

        <div id="checkout-banners" className="mt-6 flex flex-col gap-3 empty:hidden">
          {link ? (
            <Notice tone="info" title={t("link.banner")}>
              {t("link.bannerBody")}
            </Notice>
          ) : null}
          {submitError ? (
            <Notice
              tone="error"
              live
              title={submitError.kind === "OUT_OF_STOCK" ? t("submitErrors.OUT_OF_STOCK_TITLE") : undefined}
              actions={
                submitError.kind === "OUT_OF_STOCK" ? (
                  link ? (
                    <WhatsAppButton href={buildWaLink("general", undefined, locale)} label={t("link.askWa")} size="sm" />
                  ) : (
                    <Button size="sm" variant="secondary" onClick={refreshCart} loading={refreshing}>
                      {t("submitErrors.updateCart")}
                    </Button>
                  )
                ) : undefined
              }
            >
              {submitError.kind === "OUT_OF_STOCK"
                ? t("submitErrors.OUT_OF_STOCK", { items: submitError.skus.map(lineName).join(", ") })
                : t(`submitErrors.${submitError.kind}`)}
            </Notice>
          ) : null}
          {notices.length ? (
            <Notice tone="warning">
              <ul className="flex flex-col gap-1">
                {notices.map((n) => (
                  <li key={n}>{n}</li>
                ))}
              </ul>
            </Notice>
          ) : null}
          {preorderLine ? <Notice tone="info">{t("preorderNote", { lead: dashRange(preorderLine.preorderLeadWeeks) })}</Notice> : null}
        </div>

        <form id={FORM_ID} noValidate onSubmit={handleSubmit(onValid, onInvalid)} className="mt-2 flex flex-col">
          {/* ① Kontak & Alamat */}
          <div id="checkout-step-1" className="scroll-mt-4">
            <CheckoutStep
              number={1}
              title={t("steps.contact")}
              status={status(1)}
              onEdit={() => setActive(1)}
              summary={
                <>
                  <span className="block">{t("summaryContact", { name: vals.name, wa: waE164 ? formatPhoneID(waE164) : vals.wa })}</span>
                  <span className="block">{[vals.address.district, vals.address.city, vals.address.province].filter(Boolean).join(", ")}</span>
                </>
              }
              footer={
                reached === 1 || (!isDesktop && active === 1) ? (
                  <Button type="button" fullWidth className="md:w-auto md:self-start" onClick={() => goNext(1)}>
                    {t("next.shipping")}
                  </Button>
                ) : null
              }
            >
              <div className="flex flex-col gap-5">
                <Input
                  label={t("contact.name")}
                  placeholder={t("contact.namePlaceholder")}
                  autoComplete="name"
                  {...register("name")}
                  error={err(errors.name?.message)}
                />
                <Controller
                  control={control}
                  name="wa"
                  render={({ field }) => (
                    <PhoneInput
                      value={field.value}
                      onValueChange={(ch) => field.onChange(ch.e164 ?? ch.local)}
                      onBlur={field.onBlur}
                      validateOnBlur={false}
                      error={err(errors.wa?.message)}
                      name="wa"
                    />
                  )}
                />
                <Input
                  label={t("contact.email")}
                  optional
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  helper={t("contact.emailHelp")}
                  {...register("email")}
                  error={err(errors.email?.message)}
                />
                <Controller
                  control={control}
                  name="waOptIn"
                  render={({ field }) => (
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={(c) => field.onChange(c === true)}
                      label={t("contact.waOptIn")}
                      description={t("contact.waOptInHelp")}
                    />
                  )}
                />
              </div>
              <div className="flex flex-col gap-4 border-t border-border pt-6">
                <h3 className="eyebrow">{t("contact.addressHeading")}</h3>
                <Controller
                  control={control}
                  name="address"
                  render={({ field }) => (
                    <AddressForm
                      provinces={JAVA_AREAS}
                      value={field.value as AddressValue}
                      onChange={(next) => {
                        field.onChange(next);
                        if (formState.errors.address) void trigger("address");
                      }}
                      errors={addressErrors}
                      outsideJavaHref={outsideJavaHref}
                    />
                  )}
                />
              </div>
            </CheckoutStep>
          </div>

          {/* ② Pengiriman */}
          <div id="checkout-step-2" className="scroll-mt-4">
            <CheckoutStep
              number={2}
              title={t("steps.shipping")}
              status={status(2)}
              onEdit={() => setActive(2)}
              summary={selectedRate ? `${selectedRate.courier} ${selectedRate.service} · ${formatIDR(selectedRate.priceIdr)}` : undefined}
              footer={
                reached === 2 || (!isDesktop && active === 2) ? (
                  <Button type="button" fullWidth className="md:w-auto md:self-start" onClick={() => goNext(2)}>
                    {t("next.payment")}
                  </Button>
                ) : null
              }
            >
              {rates.kind === "error" ? (
                <Notice
                  tone={rates.reason === "OTHER" ? "error" : "warning"}
                  actions={
                    rates.reason === "OTHER" ? (
                      <Button size="sm" variant="secondary" onClick={() => setRatesNonce((n) => n + 1)}>
                        {t("shipping.retry")}
                      </Button>
                    ) : rates.reason === "OUTSIDE_JAVA" ? (
                      <WhatsAppButton href={outsideJavaHref} variant="link" label={tc("address.outsideJava")} />
                    ) : undefined
                  }
                >
                  {rates.reason === "OUTSIDE_JAVA" ? t("shipping.outsideJava") : rates.reason === "UNKNOWN_CITY" ? t("shipping.unknownCity") : t("shipping.error")}
                </Notice>
              ) : (
                <Controller
                  control={control}
                  name="shippingServiceCode"
                  render={({ field }) => (
                    <CourierOptions
                      rates={rateList}
                      value={field.value || null}
                      onChange={(code) => field.onChange(code)}
                      loading={rates.kind === "loading"}
                      error={err(errors.shippingServiceCode?.message)}
                      name="shippingServiceCode"
                    />
                  )}
                />
              )}
              {rates.kind === "ready" && rates.zone === "Z1" && !rates.rates.some((r) => r.type === "instant") ? (
                <p className="text-xs text-ink-muted">{t("shipping.instantInfo")}</p>
              ) : null}
              {selectedRate ? (
                <Controller
                  control={control}
                  name="insured"
                  render={({ field }) => (
                    <InsuranceToggle checked={field.value} onCheckedChange={field.onChange} amountIdr={selectedRate.insuranceIdr} name="insured" />
                  )}
                />
              ) : null}
              {rates.kind === "ready" ? <p className="text-xs text-ink-muted">{t("shipping.weight", { kg: rates.billableKg })}</p> : null}
            </CheckoutStep>
          </div>

          {/* ③ Pembayaran */}
          <div id="checkout-step-3" className="scroll-mt-4">
            <CheckoutStep
              number={3}
              title={t("steps.payment")}
              status={status(3)}
              onEdit={() => setActive(3)}
              summary={sel ? tc(`payment.names.${sel.channel ?? sel.method}`) : undefined}
            >
              <Controller
                control={control}
                name="payment"
                render={({ field }) => (
                  <PaymentMethodGroup
                    value={field.value ? parsePaymentKey(field.value) : null}
                    onChange={(s) => field.onChange(paymentKey(s))}
                    error={err(errors.payment?.message)}
                    name="payment"
                  />
                )}
              />
              <div className="flex flex-col gap-2 border-t border-border pt-6">
                <span className="eyebrow">{tc("summary.voucher")}</span>
                <VoucherField
                  value={voucherInput}
                  onValueChange={(v) => {
                    setVoucherInput(v);
                    setVoucherError(undefined);
                  }}
                  onApply={applyVoucher}
                  appliedCode={voucher?.code}
                  onRemove={() => setVoucher(null)}
                  loading={voucherLoading}
                  error={voucherError}
                />
              </div>
            </CheckoutStep>
          </div>

          <div className="flex flex-col gap-4 pt-6">
            <p className="text-xs text-ink-muted">
              {t.rich("terms", {
                link: (chunks) => (
                  <Link href="/info/terms" target="_blank" className={linkStyles()}>
                    {chunks}
                  </Link>
                ),
              })}
            </p>
            <div className={reached === 3 ? "hidden items-center justify-between gap-6 rounded-md border border-border p-4 lg:flex" : "hidden"}>
              <div className="flex flex-col">
                <span className="eyebrow text-ink-muted">{tc("summary.total")}</span>
                <span className="tabular text-xl font-semibold">{formatIDR(totalIdr)}</span>
              </div>
              <Button type="submit" loading={submitting} className="min-w-60">
                {tc("payBar.payNow")}
              </Button>
            </div>
          </div>
        </form>
      </div>

      {reached === 3 ? <StickyPayBar totalIdr={totalIdr} submit form={FORM_ID} loading={submitting} /> : null}
    </div>
  );
}
