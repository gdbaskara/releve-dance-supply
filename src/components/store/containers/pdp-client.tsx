"use client";
/**
 * PDP interactive parts (PDP-01..06, WA-02/03): gallery (follows the selected colour), VariantPicker →
 * AvailabilityLine → qty → "Tambah ke Keranjang" / "Kabari Saya via WA" → "Tanya via WA", size guide.
 */
import * as React from "react";
import { useLocale, useTranslations } from "next-intl";
import { PREORDER_MAX_QTY, type Locale, type ProductDetail, type ProductImage as Img } from "@/lib/contracts";
import { useCart } from "@/lib/cart/store";
import { buildWaLink } from "@/lib/wa";
import { cn } from "@/lib/utils/cn";
import { imageForColor } from "@/lib/utils/image-for-color";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import { AvailabilityLine } from "@/components/store/availability-line";
import { ProductImage } from "@/components/store/product-image";
import { QtyStepper } from "@/components/store/qty-stepper";
import { SizeGuideDialog } from "@/components/store/size-guide";
import { guideCategoryFor } from "@/components/store/size-guide-data";
import { VariantPicker } from "@/components/store/variant-picker";
import { resolveVariant, type Selection, type VariantState } from "@/components/store/variant-logic";
import { WhatsAppButton } from "@/components/store/whatsapp-button";
import { BackInStockForm } from "./back-in-stock-form";
import { displayVariantLabel, formatSize, sizeGroup } from "./format";

/** "7.5L (adult)" → "7.5 (adult)": the picker shows "7.5" and still groups by toddler/child/adult. */
function pickerSize(raw: string): string {
  const g = sizeGroup(raw);
  return g ? `${formatSize(raw)} (${g})` : formatSize(raw);
}


// Gallery

/** More photos than this: a "3 / 16" counter instead of dots (16 dots do not fit a 375px screen). */
const MAX_DOTS = 7;

export function PdpGallery({ images, name, modelCode, color }: { images: Img[]; name: string; modelCode: string; color?: string }) {
  const t = useTranslations("pdp.gallery");
  const forColor = color ? images.filter((i) => i.color === color) : [];
  const list = forColor.length ? forColor : images;
  const [index, setIndex] = React.useState(0);
  const scroller = React.useRef<HTMLUListElement>(null);

  if (list.length <= 1) {
    return (
      <ProductImage
        src={list[0]?.url}
        alt={list[0]?.alt ?? name}
        modelCode={modelCode}
        priority
        sizes="(min-width: 1024px) 55vw, 100vw"
      />
    );
  }
  return (
    <div role="region" aria-roledescription="carousel" aria-label={t("label", { name })} className="flex flex-col gap-3">
      <ul
        ref={scroller}
        onScroll={(e) => {
          const el = e.currentTarget;
          setIndex(Math.round(el.scrollLeft / el.clientWidth));
        }}
        className="relative flex snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] lg:grid [&::-webkit-scrollbar]:hidden lg:grid-cols-2 lg:gap-2 lg:overflow-visible"
      >
        {list.map((img, i) => (
          <li key={img.url} aria-label={t("slide", { n: i + 1, total: list.length })} className="w-full shrink-0 snap-center lg:w-auto">
            <ProductImage src={img.url} alt={img.alt || name} modelCode={modelCode} priority={i === 0} sizes="(min-width: 1024px) 28vw, 100vw" />
          </li>
        ))}
      </ul>
      {list.length > MAX_DOTS ? (
        <p className="tabular text-center text-sm text-ink-muted lg:hidden" aria-live="polite">
          {t("counter", { n: index + 1, total: list.length })}
        </p>
      ) : (
        <div className="flex justify-center lg:hidden">
          {list.map((img, i) => (
            <button
              key={img.url}
              type="button"
              aria-label={t("goTo", { n: i + 1 })}
              aria-current={i === index || undefined}
              onClick={() => scroller.current?.scrollTo({ left: i * scroller.current.clientWidth, behavior: "smooth" })}
              className="inline-flex size-11 items-center justify-center"
            >
              <span className={cn("size-2 rounded-pill", i === index ? "bg-ink" : "bg-border-strong")} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Buy box

export interface PdpClientProps {
  product: ProductDetail;
  /** Absolute product URL (for the WA message). */
  productUrl: string;
  /** Pre-selected colour (?color=). */
  initialColor?: string;
  /** Server-rendered header (eyebrow, H1, code, price) shown above the picker. */
  header: React.ReactNode;
  /** Server-rendered extras below the CTAs (trust strip, accordions). */
  children?: React.ReactNode;
}

export function PdpClient({ product, productUrl, initialColor, header, children }: PdpClientProps) {
  const t = useTranslations("pdp");
  const tc = useTranslations("common");
  const locale = useLocale() as Locale;
  const add = useCart((s) => s.add);

  // Picker works on display sizes; SKUs are unchanged.
  const pickerProduct = React.useMemo(
    () => ({ ...product, variants: product.variants.map((v) => ({ ...v, size: v.size ? pickerSize(v.size) : null })) }),
    [product],
  );
  const [state, setState] = React.useState<VariantState>(() =>
    resolveVariant(pickerProduct, initialColor && product.colors.includes(initialColor) ? ({ color: initialColor } as Selection) : {}),
  );
  const [qty, setQty] = React.useState(1);
  const [guideOpen, setGuideOpen] = React.useState(false);
  const [notifyOpen, setNotifyOpen] = React.useState(false);

  const real = state.sku ? (product.variants.find((v) => v.sku === state.sku) ?? null) : null;
  const status = real?.status ?? null;
  const maxQty = !real ? 1 : status === "PREORDER" ? PREORDER_MAX_QTY : Math.max(1, real.available);
  const label = real ? displayVariantLabel(real) : null;
  const firstMissing = state.missing[0];

  const onChange = (next: VariantState) => {
    setState(next);
    setQty(1);
    setNotifyOpen(false);
  };

  const addToCart = () => {
    if (!real || status === "SOLD_OUT" || !label) return;
    add(
      {
        sku: real.sku,
        qty: Math.min(qty, maxQty),
        productSlug: product.slug,
        name: product.name,
        modelCode: product.modelCode,
        variantLabel: label,
        priceIdr: product.priceIdr,
        imageUrl: imageForColor(product.images, real.color)?.url ?? null,
        isPreorder: status === "PREORDER",
      },
      maxQty,
    );
  };

  const askHref = buildWaLink(
    real?.status === "SOLD_OUT" ? "soldOut" : "pdp",
    { name: `${product.name}`, modelCode: product.modelCode, variant: label ?? undefined, url: productUrl },
    locale,
  );
  const guideHref = buildWaLink("sizeGuide", { name: product.name, modelCode: product.modelCode }, locale);

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,440px)] lg:gap-12 xl:gap-16">
      <div className="-mx-[var(--gutter)] md:mx-0">
        <div className="lg:sticky lg:top-[calc(var(--header-h)+1.5rem)]">
          {/* key: a new colour remounts the gallery so the slide index and scroll position start at photo 1. */}
          <PdpGallery
            key={state.selection.color ?? "all"}
            images={product.images}
            name={product.name}
            modelCode={product.modelCode}
            color={state.selection.color}
          />
        </div>
      </div>
      <div className="flex min-w-0 flex-col gap-6">
        {header}
        <VariantPicker
          product={pickerProduct}
          selection={state.selection}
          onChange={onChange}
          onSizeGuide={() => setGuideOpen(true)}
        />
        <AvailabilityLine status={status} available={real?.available} leadWeeks={real?.preorderLeadWeeks} />

        {product.discipline === "Pointe" ? (
          <Notice tone="info" title={t("pointeCalloutTitle")}>
            {t("pointeCallout")}
          </Notice>
        ) : null}

        <div className="flex flex-col gap-3">
          {status === "SOLD_OUT" && real && label ? (
            notifyOpen ? (
              <BackInStockForm sku={real.sku} variantLabel={label} />
            ) : (
              <Button fullWidth onClick={() => setNotifyOpen(true)}>
                {t("notify.cta")}
              </Button>
            )
          ) : (
            <>
              <div className="flex items-center gap-3">
                <QtyStepper value={qty} max={maxQty} onChange={setQty} disabled={!real} itemName={product.name} />
                <Button className="min-w-0 flex-1 whitespace-normal px-3 leading-tight" disabled={!real} onClick={addToCart}>
                  {t("addToCart")}
                </Button>
              </div>
              {!real && firstMissing ? (
                <p className="text-sm text-ink-muted">{t("selectFirst", { option: tc(`variant.${firstMissing}`) })}</p>
              ) : status === "PREORDER" ? (
                <p className="text-sm text-ink-muted">{t("preorderNote")}</p>
              ) : real && maxQty <= 3 ? (
                <p className="text-sm text-ink-muted">{t("maxQtyNote", { n: maxQty })}</p>
              ) : null}
            </>
          )}
          <WhatsAppButton href={askHref} label={t("askWa")} fullWidth />
        </div>

        {children}
      </div>
      <SizeGuideDialog
        open={guideOpen}
        onOpenChange={setGuideOpen}
        waHref={guideHref}
        defaultCategory={guideCategoryFor(product.discipline, product.group)}
        highlightSize={state.selection.size ?? null}
      />
    </div>
  );
}
