"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Plus, Trash2 } from "lucide-react";
import { createCheckoutLinkAction, getProductAdminAction } from "@/lib/actions/admin";
import type { ProductAdminDetail, VariantAdminView } from "@/lib/services/stock";
import { formatDateTimeWIB, formatIDR, normalizePhoneID } from "@/lib/format";
import { buildWaLinkTo, checkoutLinkShareText } from "@/lib/wa";
import type { Locale } from "@/lib/contracts";
import { cn } from "@/lib/utils/cn";
import { Button, buttonVariants } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { CopyButton } from "@/components/ui/copy-button";
import { Input } from "@/components/ui/input";
import { Notice } from "@/components/ui/notice";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { StockBadge } from "@/components/store/stock-badge";
import { WhatsAppIcon } from "@/components/store/whatsapp-button";

export interface BuilderProduct {
  id: string;
  name: string;
  modelCode: string;
  discipline: string;
  audience: string;
  priceIdr: number;
}

interface Line {
  sku: string;
  qty: number;
  name: string;
  modelCode: string;
  label: string;
  priceIdr: number;
  variant: VariantAdminView;
}

type Dim = "color" | "size" | "width" | "shank";
/** Variant dimensions in picking order; `labelKey` is under admin.builder. */
const DIMS: readonly { key: Dim; labelKey: "dimColor" | "dimSize" | "dimWidth" | "dimShank" }[] = [
  { key: "color", labelKey: "dimColor" },
  { key: "size", labelKey: "dimSize" },
  { key: "width", labelKey: "dimWidth" },
  { key: "shank", labelKey: "dimShank" },
];

/** Server error codes that have a message in admin.json `builder.errors`. */
const KNOWN_ERRORS = ["INVALID_INPUT", "UNKNOWN_SKU", "INVALID_WA"] as const;

function maxQty(v: VariantAdminView) {
  return v.available > 0 ? v.available : v.preorderEnabled ? 5 : 0;
}

/** ADM-05 CheckoutLinkBuilder: search product → variant + qty → lines → optional customer → link + Copy + "Kirim via WA". */
export function CheckoutLinkBuilder({ products }: { products: BuilderProduct[] }) {
  const router = useRouter();
  const t = useTranslations("admin.builder");
  const adminLocale = useLocale() as Locale;
  const [productId, setProductId] = React.useState<string | null>(null);
  const [detail, setDetail] = React.useState<ProductAdminDetail | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [pick, setPick] = React.useState<Partial<Record<Dim, string>>>({});
  const [qty, setQty] = React.useState("1");
  const [lines, setLines] = React.useState<Line[]>([]);
  const [name, setName] = React.useState("");
  const [wa, setWa] = React.useState("");
  const [locale, setLocale] = React.useState<"id" | "en">("id");
  const [waError, setWaError] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<{ url: string; expiresAt: Date; waLink: string | null } | null>(null);
  const [pending, startTransition] = React.useTransition();

  const productOptions = React.useMemo(
    () => products.map((p) => ({ value: p.id, label: `${p.name} · ${p.modelCode}`, hint: p.audience === "Adult" ? p.discipline : `${p.discipline} · ${p.audience}` })),
    [products],
  );

  const loadProduct = async (id: string | null) => {
    setProductId(id);
    setDetail(null);
    setPick({});
    setQty("1");
    if (!id) return;
    setLoading(true);
    try {
      const d = await getProductAdminAction(id);
      setDetail(d);
      if (d) {
        // pre-select dimensions that have a single value
        const auto: Partial<Record<Dim, string>> = {};
        for (const dim of DIMS) {
          const vals = [...new Set(d.variants.map((v) => v[dim.key]).filter((x): x is string => !!x))];
          if (vals.length === 1) auto[dim.key] = vals[0];
        }
        setPick(auto);
      }
    } finally {
      setLoading(false);
    }
  };

  const dims = detail ? DIMS.filter((d) => detail.variants.some((v) => v[d.key])) : [];

  /** Values for `dim` that exist given the choices made in the dimensions before it. */
  const valuesFor = (dim: Dim) => {
    if (!detail) return [];
    const idx = dims.findIndex((d) => d.key === dim);
    const before = dims.slice(0, idx);
    const out: string[] = [];
    for (const v of detail.variants) {
      if (before.some((b) => pick[b.key] && v[b.key] !== pick[b.key])) continue;
      const val = v[dim];
      if (val && !out.includes(val)) out.push(val);
    }
    return out;
  };

  const selected: VariantAdminView | null =
    detail && dims.every((d) => pick[d.key])
      ? (detail.variants.find((v) => dims.every((d) => v[d.key] === pick[d.key])) ?? null)
      : null;

  const qtyNum = Number(qty);
  const selMax = selected ? maxQty(selected) : 0;
  const qtyInvalid = !Number.isInteger(qtyNum) || qtyNum < 1;

  const addLine = () => {
    if (!detail || !selected || qtyInvalid || selMax === 0) return;
    const product = products.find((p) => p.id === detail.id);
    setLines((prev) => {
      const existing = prev.find((l) => l.sku === selected.sku);
      if (existing) return prev.map((l) => (l.sku === selected.sku ? { ...l, qty: Math.min(l.qty + qtyNum, Math.max(selMax, 1)) } : l));
      return [
        ...prev,
        {
          sku: selected.sku,
          qty: Math.min(qtyNum, selMax),
          name: detail.name,
          modelCode: detail.modelCode,
          label: selected.label,
          priceIdr: product?.priceIdr ?? detail.priceIdr,
          variant: selected,
        },
      ];
    });
    setResult(null);
    setQty("1");
  };

  const subtotal = lines.reduce((n, l) => n + l.qty * l.priceIdr, 0);

  const create = () => {
    setError(null);
    setWaError(null);
    if (wa.trim() && !normalizePhoneID(wa)) {
      setWaError(t("errors.invalidWaExample"));
      return;
    }
    startTransition(async () => {
      const res = await createCheckoutLinkAction({
        items: lines.map((l) => ({ sku: l.sku, qty: l.qty })),
        customerName: name.trim() || undefined,
        customerWa: wa.trim() || undefined,
        locale,
      });
      if (res.ok) {
        setResult({ url: res.url, expiresAt: res.expiresAt, waLink: res.waLink });
        router.refresh();
      } else if (res.error === "INVALID_WA") {
        setWaError(t("errors.INVALID_WA"));
      } else {
        setError((KNOWN_ERRORS as readonly string[]).includes(res.error) ? t(`errors.${res.error}`) : t("errors.failed"));
      }
    });
  };

  const reset = () => {
    setLines([]);
    setName("");
    setWa("");
    setResult(null);
    setError(null);
    void loadProduct(null);
  };

  const shareHref = result
    ? // Written to the buyer, so in the checkout page language (not the admin UI language).
      (result.waLink ?? buildWaLinkTo("", checkoutLinkShareText(locale, { name, url: result.url })))
    : "";

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
      <section className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-4" aria-labelledby="clb-pick">
        <h2 id="clb-pick" className="text-sm font-semibold text-ink">
          {t("step1")}
        </h2>
        <Combobox
          label={t("product")}
          options={productOptions}
          value={productId}
          onChange={(v) => void loadProduct(v)}
          placeholder={t("productPlaceholder")}
          emptyText={(q) => t("noProductMatch", { query: q })}
        />
        {loading ? (
          <div className="grid grid-cols-2 gap-3">
            <Skeleton className="h-12" />
            <Skeleton className="h-12" />
          </div>
        ) : detail ? (
          <>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-[repeat(auto-fit,minmax(160px,1fr))]">
              {dims.map((d) => {
                const values = valuesFor(d.key);
                return (
                  <Select
                    key={d.key}
                    label={t(d.labelKey)}
                    value={pick[d.key] ?? ""}
                    placeholder={t("pick")}
                    onChange={(e) => {
                      const val = e.target.value;
                      setPick((p) => {
                        const next = { ...p, [d.key]: val };
                        // clear later dimensions that no longer combine
                        const idx = dims.findIndex((x) => x.key === d.key);
                        for (const later of dims.slice(idx + 1)) {
                          const ok = detail.variants.some(
                            (v) => dims.slice(0, idx + 1).every((b) => v[b.key] === next[b.key]) && v[later.key] === next[later.key],
                          );
                          if (!ok) delete next[later.key];
                        }
                        return next;
                      });
                    }}
                    options={values.map((v) => ({ value: v, label: v }))}
                    className="h-10"
                  />
                );
              })}
            </div>
            <div className="flex flex-wrap items-end gap-3">
              <Input
                label={t("qty")}
                type="number"
                inputMode="numeric"
                min={1}
                max={selMax || undefined}
                value={qty}
                onChange={(e) => setQty(e.target.value)}
                className="h-10 w-24"
                wrapperClassName="w-24"
              />
              <Button
                size="sm"
                variant="secondary"
                className="h-10"
                onClick={addLine}
                disabled={!selected || qtyInvalid || selMax === 0}
                leadingIcon={<Plus size={16} strokeWidth={1.5} aria-hidden />}
              >
                {t("addItem")}
              </Button>
              {selected ? (
                <span className="flex flex-col items-start gap-1 pb-1 text-sm">
                  <StockBadge status={selected.status} available={selected.available} leadWeeks={selected.preorderLeadWeeks} />
                  <span className="font-mono text-xs text-ink-muted">{selected.sku}</span>
                </span>
              ) : null}
            </div>
            {selected && selMax === 0 ? <Notice tone="warning">{t("soldOutNoPreorder")}</Notice> : null}
            {selected && selMax > 0 && qtyNum > selMax ? (
              <p className="text-sm text-warning">{t("maxQty", { max: selMax })}</p>
            ) : null}
          </>
        ) : productId ? (
          <Notice tone="error">{t("productNotFound")}</Notice>
        ) : null}

        <h2 className="mt-2 text-sm font-semibold text-ink">{t("step2", { count: lines.length })}</h2>
        {lines.length === 0 ? (
          <p className="rounded-md border border-dashed border-border-strong px-4 py-6 text-center text-sm text-ink-muted">
            {t("noItems")}
          </p>
        ) : (
          <ul className="divide-y divide-border rounded-md border border-border" data-testid="link-lines">
            {lines.map((l) => (
              <li key={l.sku} className="flex items-center gap-3 px-3 py-2.5 text-sm">
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="font-semibold">
                    {l.name} <span className="font-mono font-normal text-ink-muted">{l.modelCode}</span>
                  </span>
                  <span className="text-ink-muted">{l.label}</span>
                  {l.variant.available <= 0 && l.variant.preorderEnabled ? <span className="text-xs text-warning">{t("preorder")}</span> : null}
                </div>
                <input
                  type="number"
                  min={1}
                  max={maxQty(l.variant) || undefined}
                  value={l.qty}
                  aria-label={t("lineQty", { name: l.name, label: l.label })}
                  onChange={(e) => {
                    const n = Math.max(1, Math.min(Number(e.target.value) || 1, maxQty(l.variant) || 1));
                    setLines((prev) => prev.map((x) => (x.sku === l.sku ? { ...x, qty: n } : x)));
                    setResult(null);
                  }}
                  className="tabular h-9 w-16 rounded-sm border border-border-strong bg-surface px-2 text-base"
                />
                <span className="tabular hidden w-28 text-right font-semibold md:block">{formatIDR(l.qty * l.priceIdr)}</span>
                <button
                  type="button"
                  onClick={() => {
                    setLines((prev) => prev.filter((x) => x.sku !== l.sku));
                    setResult(null);
                  }}
                  aria-label={t("removeLine", { name: l.name, label: l.label })}
                  className="inline-flex size-9 items-center justify-center rounded-sm text-ink-muted hover:bg-surface-alt hover:text-error"
                >
                  <Trash2 size={16} strokeWidth={1.5} aria-hidden />
                </button>
              </li>
            ))}
            <li className="tabular flex justify-between bg-surface-alt px-3 py-2.5 text-sm font-semibold">
              <span>{t("subtotal")}</span>
              <span>{formatIDR(subtotal)}</span>
            </li>
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-4" aria-labelledby="clb-customer">
        <h2 id="clb-customer" className="text-sm font-semibold text-ink">
          {t("step3")}
        </h2>
        <Input label={t("name")} optional value={name} onChange={(e) => setName(e.target.value)} maxLength={100} className="h-10" autoComplete="off" />
        <Input
          label={t("whatsapp")}
          optional
          type="tel"
          inputMode="tel"
          value={wa}
          onChange={(e) => {
            setWa(e.target.value);
            setWaError(null);
          }}
          placeholder="0812 3456 7890"
          error={waError ?? undefined}
          helper={t("whatsappHelper")}
          className="h-10"
          autoComplete="off"
        />
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-ink">{t("checkoutLanguage")}</span>
          <SegmentedControl
            label={t("checkoutLanguage")}
            size="sm"
            value={locale}
            onChange={(v) => setLocale(v as "id" | "en")}
            options={[
              { value: "id", label: t("languageId") },
              { value: "en", label: t("languageEn") },
            ]}
          />
        </div>
        {error ? (
          <Notice tone="error" live>
            {error}
          </Notice>
        ) : null}
        <Button onClick={create} disabled={lines.length === 0} loading={pending} size="sm" className="h-11">
          {t("create")}
        </Button>
        <p className="text-xs text-ink-muted">{t("createNote")}</p>

        {result ? (
          <div className="flex flex-col gap-3 rounded-md bg-success-bg p-3" role="status" data-testid="link-result">
            <p className="text-sm font-semibold text-success">{t("ready", { date: formatDateTimeWIB(result.expiresAt, adminLocale) })}</p>
            <input
              readOnly
              value={result.url}
              aria-label={t("linkLabel")}
              onFocus={(e) => e.currentTarget.select()}
              data-testid="checkout-link-url"
              className="h-10 w-full rounded-sm border border-border-strong bg-surface px-3 font-mono text-sm text-ink"
            />
            <div className="flex flex-wrap gap-2">
              <CopyButton value={result.url} appearance="outline" ariaLabel={t("copyLink")} className="h-9 min-h-9 bg-surface text-xs" />
              <a
                href={shareHref}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(buttonVariants({ variant: "whatsapp", size: "sm" }))}
                data-testid="send-wa"
              >
                <WhatsAppIcon size={18} /> {t("sendWa")}
              </a>
            </div>
            {!result.waLink ? <p className="text-xs text-ink-muted">{t("noBuyerNumber")}</p> : null}
            <Button size="sm" variant="ghost" onClick={reset} className="self-start">
              {t("newLink")}
            </Button>
          </div>
        ) : null}
      </section>
    </div>
  );
}
