"use client";

import * as React from "react";
import { useLocale, useTranslations } from "next-intl";
import { SearchX } from "lucide-react";
import type { Locale } from "@/lib/contracts";
import { Button } from "@/components/ui";
import {
  AvailabilityLine,
  CartDrawer,
  CartLine,
  ColorSwatches,
  CompareStyles,
  DemoBanner,
  EmptyState,
  FilterPanel,
  FilterSheet,
  Footer,
  Header,
  LanguageToggle,
  Price,
  ProductCard,
  QtyStepper,
  SizeGuideContent,
  SizeGuideDialog,
  StockBadge,
  TrustStrip,
  VariantPicker,
  WhatsAppButton,
  Wordmark,
  resolveVariant,
  variantLabel,
  type FilterSelection,
  type VariantState,
} from "@/components/store";
import type { ShowcaseData } from "./mock-data";
import { Group, Specimen } from "./frame";

export const WA_DEMO = "https://wa.me/6281100000000";

export function StoreSection({ data }: { data: ShowcaseData }) {
  const t = useTranslations("designSystem");
  const tc = useTranslations("common");
  const locale = useLocale() as Locale;
  const { claudia, jocelyn } = data.picker;
  const [state, setState] = React.useState<VariantState>(() => resolveVariant(claudia, { color: claudia.colors[0] }));
  const [jzState, setJzState] = React.useState<VariantState>(() => resolveVariant(jocelyn, {}));
  const [showMissing, setShowMissing] = React.useState(false);
  const [sizeGuide, setSizeGuide] = React.useState(false);
  const [cartOpen, setCartOpen] = React.useState(false);
  const [lines, setLines] = React.useState(data.cart);
  const [qty, setQty] = React.useState(1);
  const [filters, setFilters] = React.useState<FilterSelection>({ size: ["7.5L"], availability: ["READY"] });

  const facets = [
    { key: "discipline", label: t("store.filter.discipline"), kind: "checkbox" as const, options: [{ value: "Ballet", count: 7 }, { value: "Pointe", count: 6 }, { value: "Jazz", count: 4 }, { value: "Tap", count: 4 }, { value: "Character", count: 2 }] },
    { key: "size", label: tc("variant.size"), kind: "chips" as const, options: ["5L", "6L", "6.5L", "7L", "7.5L", "8L", "9L", "10L"].map((s, i) => ({ value: s, count: i === 7 ? 0 : 12 - i })) },
    { key: "width", label: tc("variant.width"), kind: "chips" as const, options: ["Narrow", "Medium", "Wide", "B", "C", "D"].map((w) => ({ value: w, count: 6 })) },
    { key: "color", label: tc("variant.color"), kind: "swatch" as const, options: [{ value: "Ballet Pink", count: 9 }, { value: "Black", count: 14 }, { value: "Suntan", count: 5 }, { value: "White", count: 6 }] },
    { key: "availability", label: t("store.filter.availability"), kind: "checkbox" as const, options: [{ value: "READY", label: "Ready", count: 28 }, { value: "PREORDER", label: "Pre-order", count: 9 }] },
  ];
  const subtotal = lines.reduce((n, l) => n + l.priceIdr * l.qty, 0);
  const v = state.variant;

  return (
    <>
      <Group title={t("store.identity.title")} description={t("store.identity.description")}>
        <div className="grid gap-4 lg:grid-cols-[1fr_2fr]">
          <Specimen label="Wordmark" code='<Wordmark size="lg" />' bodyClassName="flex min-h-48 items-center justify-center">
            <Wordmark size="lg" />
          </Specimen>
          <div className="flex min-w-0 flex-col gap-4">
            <Specimen label="DemoBanner" bodyClassName="p-0">
              <DemoBanner />
            </Specimen>
            <Specimen label="LanguageToggle" code="hrefs={{ id, en }}">
              <LanguageToggle locale={locale} hrefs={{ id: "/id/design-system", en: "/en/design-system" }} />
            </Specimen>
            <Specimen label="TrustStrip" bodyClassName="p-0">
              <TrustStrip />
            </Specimen>
          </div>
        </div>
        <Specimen label={t("store.identity.header")} code="<Header navItems cartCount languageToggle linkAs />" bodyClassName="p-0">
          <Header
            homeHref="#"
            navItems={[
              { label: "Shoes", href: "#shoes", active: true },
              { label: "Pointe", href: "#pointe" },
              { label: "Dancewear", href: "#dancewear" },
              { label: "Kids", href: "#kids" },
              { label: t("store.identity.track"), href: "#track" },
            ]}
            cartCount={lines.reduce((n, l) => n + l.qty, 0)}
            onCartClick={() => setCartOpen(true)}
            onSearchClick={() => {}}
            languageToggle={<LanguageToggle locale={locale} hrefs={{ id: "/id/design-system", en: "/en/design-system" }} />}
            mobileMenuFooter={<WhatsAppButton href={WA_DEMO} variant="link" />}
            className="static"
          />
        </Specimen>
        <Specimen label="Footer" bodyClassName="p-0">
          <Footer
            columns={[
              { title: t("store.footer.shop"), links: [{ label: "Shoes", href: "#a" }, { label: "Pointe", href: "#b" }, { label: "Dancewear", href: "#c" }, { label: "Kids", href: "#d" }] },
              { title: t("store.footer.help"), links: [{ label: t("store.footer.shipping"), href: "#e" }, { label: t("store.footer.payment"), href: "#f" }, { label: "FAQ", href: "#g" }, { label: t("store.identity.track"), href: "#h" }] },
              { title: t("store.footer.about"), links: [{ label: t("store.footer.aboutUs"), href: "#i" }, { label: t("store.footer.terms"), href: "#j" }, { label: t("store.footer.privacy"), href: "#k" }] },
            ]}
            contact={
              <>
                <h2 className="eyebrow">{t("store.footer.contact")}</h2>
                <WhatsAppButton href={WA_DEMO} variant="link" label="+62 811-0000-0000" />
                <p className="text-ink-muted">{t("store.footer.address")}</p>
                <p className="text-ink-muted">{t("store.footer.hours")}</p>
              </>
            }
            bottomSlot={<LanguageToggle locale={locale} hrefs={{ id: "/id/design-system", en: "/en/design-system" }} />}
          />
        </Specimen>
      </Group>

      <Group title={t("store.product.title")} description={t("store.product.description")}>
        <div className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 md:gap-x-6 lg:grid-cols-4 lg:gap-x-8">
          {data.grid.map((p, i) => (
            <ProductCard key={p.slug} product={p} href={`#${p.slug}`} priceFrom={i === 1} tag={i === 0 ? t("store.product.new") : undefined} />
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <Specimen label="Price" code='size="sm|md|lg|xl" from'>
            <div className="flex flex-col gap-2">
              <Price value={675000} size="sm" />
              <Price value={1465000} size="md" />
              <Price value={2790000} size="lg" />
              <Price value={3005000} size="md" from />
            </div>
          </Specimen>
          <Specimen label="StockBadge" code='appearance="badge|inline"'>
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap gap-2">
                <StockBadge status="READY" />
                <StockBadge status="LOW" available={2} />
                <StockBadge status="PREORDER" leadWeeks="4-6" />
                <StockBadge status="SOLD_OUT" />
              </div>
              <StockBadge status="READY" appearance="inline" />
              <StockBadge status="LOW" available={1} appearance="inline" />
            </div>
          </Specimen>
          <Specimen label="ColorSwatches · max 5 + N">
            <div className="flex flex-col gap-3">
              <ColorSwatches colors={["Ballet Pink", "Black", "White"]} />
              <ColorSwatches colors={["Ballet Pink", "Black", "White", "Suntan", "Sand", "Caramel", "Mocha", "Light Grey"]} />
              <ColorSwatches colors={["Sparkle Gold", "Sparkle Silver", "Black-White", "Lilac"]} size={22} />
            </div>
          </Specimen>
        </div>
      </Group>

      <Group id="variant-picker" title="VariantPicker" description={t("store.picker.description")}>
        <div className="grid gap-4 lg:grid-cols-[3fr_2fr]">
          <Specimen label={`${claudia.name} · ${claudia.modelCode}`} code="options: Color · Size · Width · Shank">
            <div className="flex flex-col gap-6">
              <div className="flex flex-col gap-1">
                <span className="eyebrow text-ink-muted">{claudia.discipline}</span>
                <h4 className="text-2xl font-semibold">{claudia.name}</h4>
                <span className="text-sm text-ink-muted">{tc("product.modelCode", { code: claudia.modelCode })}</span>
                <Price value={claudia.priceIdr} size="lg" className="mt-2" />
              </div>
              <VariantPicker
                product={claudia}
                defaultSelection={{ color: claudia.colors[0] }}
                onChange={(s) => {
                  setState(s);
                  setShowMissing(false);
                }}
                onSizeGuide={() => setSizeGuide(true)}
                showMissing={showMissing}
              />
              <AvailabilityLine status={v?.status ?? null} available={v?.available} leadWeeks={v?.preorderLeadWeeks} />
              {v?.status === "SOLD_OUT" ? (
                <WhatsAppButton href={WA_DEMO} label={tc("wa.notifyMe")} fullWidth />
              ) : (
                <Button fullWidth onClick={() => !state.complete && setShowMissing(true)}>
                  {v?.status === "PREORDER" ? t("store.picker.preorderCta") : t("primitives.button.addToCart")}
                </Button>
              )}
              <WhatsAppButton href={WA_DEMO} variant="link" />
            </div>
          </Specimen>
          <div className="flex min-w-0 flex-col gap-4">
            <Specimen label={t("store.picker.output")} tone="alt">
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
                <dt className="text-ink-muted">selectedSku</dt>
                <dd className="break-all font-mono text-xs">{state.sku ?? "null"}</dd>
                <dt className="text-ink-muted">label</dt>
                <dd>{v ? variantLabel(v) : "—"}</dd>
                <dt className="text-ink-muted">status</dt>
                <dd>{v ? <StockBadge status={v.status} available={v.available} leadWeeks={v.preorderLeadWeeks} /> : "—"}</dd>
                <dt className="text-ink-muted">missing</dt>
                <dd className="font-mono text-xs">[{state.missing.join(", ")}]</dd>
              </dl>
            </Specimen>
            <Specimen label={`${jocelyn.name} · Narrow / Medium / Wide`}>
              <VariantPicker product={jocelyn} onChange={setJzState} />
              <AvailabilityLine className="mt-5" status={jzState.variant?.status ?? null} available={jzState.variant?.available} />
            </Specimen>
            <Specimen label="QtyStepper" code="max = available | 5 (pre-order)">
              <div className="flex items-center gap-4">
                <QtyStepper value={qty} onChange={setQty} max={3} itemName="SD09" />
                <span className="text-sm text-ink-muted">{t("store.picker.qtyNote")}</span>
              </div>
            </Specimen>
          </div>
        </div>
        <SizeGuideDialog open={sizeGuide} onOpenChange={setSizeGuide} waHref={WA_DEMO} defaultCategory="pointe" />
      </Group>

      <Group title={t("store.cart.title")} description={t("store.cart.description")}>
        <div className="grid gap-4 lg:grid-cols-2">
          <Specimen label="CartLine" code="<CartLine line onQtyChange onRemove />">
            <ul className="-my-4 divide-y divide-border">
              {lines.map((l) => (
                <li key={l.sku}>
                  <CartLine
                    line={l}
                    onQtyChange={(sku, q) => setLines((ls) => ls.map((x) => (x.sku === sku ? { ...x, qty: q } : x)))}
                    onRemove={(sku) => setLines((ls) => ls.filter((x) => x.sku !== sku))}
                  />
                </li>
              ))}
              <li>
                <CartLine line={{ ...data.cart[0], sku: "locked" }} locked />
              </li>
            </ul>
          </Specimen>
          <div className="flex min-w-0 flex-col gap-4">
            <Specimen label="CartDrawer" code="right 420px desktop · bottom sheet mobile">
              <div className="flex flex-wrap gap-3">
                <Button variant="secondary" onClick={() => setCartOpen(true)}>
                  {t("store.cart.open", { n: lines.reduce((n, l) => n + l.qty, 0) })}
                </Button>
                <Button variant="ghost" onClick={() => setLines(data.cart)}>
                  {t("store.cart.reset")}
                </Button>
              </div>
            </Specimen>
            <Specimen label="EmptyState">
              <EmptyState
                icon={<SearchX size={36} strokeWidth={1} aria-hidden />}
                title={t("store.cart.emptyTitle")}
                description={t("store.cart.emptyBody")}
                actions={
                  <>
                    <Button variant="secondary">{tc("empty.continue")}</Button>
                    <WhatsAppButton href={WA_DEMO} variant="link" />
                  </>
                }
              />
            </Specimen>
          </div>
        </div>
        <CartDrawer
          open={cartOpen}
          onOpenChange={setCartOpen}
          lines={lines}
          subtotalIdr={subtotal}
          notices={[{ tone: "warning", message: t("store.cart.notice") }]}
          onQtyChange={(sku, q) => setLines((ls) => ls.map((x) => (x.sku === sku ? { ...x, qty: q } : x)))}
          onRemove={(sku) => setLines((ls) => ls.filter((x) => x.sku !== sku))}
          onCheckout={() => setCartOpen(false)}
          waHref={WA_DEMO}
        />
      </Group>

      <Group title={t("store.filter.title")} description={t("store.filter.description")}>
        <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
          <Specimen label={t("store.filter.sidebar")}>
            <FilterPanel facets={facets} selected={filters} onChange={setFilters} onClear={() => setFilters({})} defaultOpen={["size", "color", "availability"]} />
          </Specimen>
          <div className="flex min-w-0 flex-col gap-4">
            <Specimen label={t("store.filter.sheet")}>
              <div className="flex items-center justify-between gap-3">
                <span className="tabular text-sm text-ink-muted">{t("store.filter.count", { n: 37 })}</span>
                <FilterSheet facets={facets} selected={filters} onChange={setFilters} onClear={() => setFilters({})} resultCount={37} />
              </div>
            </Specimen>
            <Specimen label="CompareStyles">
              <CompareStyles items={data.compare} />
            </Specimen>
          </div>
        </div>
      </Group>

      <Group id="sizeguide" title="SizeGuide" description={t("store.sizeGuide.description")}>
        <Specimen label={t("store.sizeGuide.inline")} code="<SizeGuideContent waHref /> · <SizeGuideDialog />">
          <div className="max-w-2xl">
            <SizeGuideContent waHref={WA_DEMO} />
          </div>
        </Specimen>
      </Group>
    </>
  );
}

