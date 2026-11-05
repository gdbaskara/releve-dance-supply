"use client";
/**
 * CART-02/03/05: guest cart from the shared Zustand store, re-validated against the server
 * (validateCartAction) whenever `active` becomes true (drawer opened, cart page mounted).
 * Server is the source of truth for price, max qty and pre-order status; the store keeps a display snapshot.
 */
import * as React from "react";
import { useLocale, useTranslations } from "next-intl";
import { PREORDER_MAX_QTY, type CartLineView, type CartNotice, type StockStatus } from "@/lib/contracts";
import { validateCartAction } from "@/lib/actions/storefront";
import { useCart, toCartInput, type CartItem } from "@/lib/cart/store";
import { buildWaLink } from "@/lib/wa";
import type { NoticeTone } from "@/components/ui/notice";
import { prettifyVariantLabel } from "./format";

const noopSubscribe = () => () => {};
/** false during SSR & the hydration pass, true afterwards (avoids cart-count hydration mismatches). */
export function useHydrated(): boolean {
  return React.useSyncExternalStore(noopSubscribe, () => true, () => false);
}

interface LineInfo {
  maxQty: number;
  status: StockStatus;
  preorderLeadWeeks: string | null;
}

export interface CartNoticeView {
  key: string;
  tone: NoticeTone;
  message: string;
}

export interface ValidatedCartState {
  hydrated: boolean;
  items: CartItem[];
  lines: CartLineView[];
  notices: CartNoticeView[];
  subtotalIdr: number;
  count: number;
  hasPreorder: boolean;
  validating: boolean;
  /** Has at least one server validation completed in this session? */
  validated: boolean;
  waHref: string;
  setQty: (sku: string, qty: number) => void;
  remove: (sku: string) => void;
}

export function useValidatedCart(active: boolean): ValidatedCartState {
  const t = useTranslations("cart");
  const locale = useLocale() as "id" | "en";
  const hydrated = useHydrated();
  const items = useCart((s) => s.items);
  const setQtyStore = useCart((s) => s.setQty);
  const removeStore = useCart((s) => s.remove);
  const [info, setInfo] = React.useState<Record<string, LineInfo>>({});
  const [notices, setNotices] = React.useState<CartNoticeView[]>([]);
  const [validating, setValidating] = React.useState(false);
  const [validated, setValidated] = React.useState(false);
  const run = React.useRef(0);
  const tRef = React.useRef(t);
  React.useEffect(() => {
    tRef.current = t;
  }, [t]);

  const validate = React.useCallback(async () => {
    const before = useCart.getState().items;
    if (before.length === 0) {
      setNotices([]);
      setValidated(true);
      return;
    }
    const t = tRef.current;
    const id = ++run.current;
    setValidating(true);
    try {
      const res = await validateCartAction(toCartInput(before));
      if (id !== run.current) return;
      const prev = new Map(before.map((i) => [i.sku, i]));
      const sent = new Set(before.map((i) => i.sku));
      const nameOf = (sku: string) => {
        const p = prev.get(sku);
        return p ? `${p.name} (${p.variantLabel})` : t("notices.unknownItem");
      };
      const fromServer: CartItem[] = res.lines.map((l) => {
        const p = prev.get(l.sku);
        return {
          sku: l.sku,
          qty: l.qty,
          productSlug: l.productSlug,
          name: l.name,
          modelCode: l.modelCode,
          variantLabel: p?.variantLabel ?? prettifyVariantLabel(l.variantLabel),
          priceIdr: l.priceIdr,
          imageUrl: l.imageUrl,
          isPreorder: l.isPreorder,
        };
      });
      // Keep anything added while the request was in flight.
      const current = useCart.getState().items;
      const added = current.filter((i) => !sent.has(i.sku));
      useCart.getState().replaceAll([...fromServer, ...added]);
      setInfo((old) => {
        const next = { ...old };
        for (const l of res.lines) next[l.sku] = { maxQty: l.maxQty, status: l.status, preorderLeadWeeks: l.preorderLeadWeeks };
        return next;
      });
      setNotices(
        res.notices.map((n: CartNotice, i) => ({
          key: `${n.type}-${n.sku}-${i}`,
          tone: n.type === "NOW_PREORDER" ? "info" : "warning",
          message:
            n.type === "QTY_REDUCED"
              ? t("notices.QTY_REDUCED", { item: nameOf(n.sku), from: n.from, to: n.to })
              : n.type === "UNKNOWN_SKU"
                ? t("notices.UNKNOWN_SKU")
                : t(`notices.${n.type}`, { item: nameOf(n.sku) }),
        })),
      );
      setValidated(true);
    } catch {
      // Network/server hiccup: keep the snapshot; checkout re-validates anyway.
    } finally {
      if (id === run.current) setValidating(false);
    }
  }, []);

  React.useEffect(() => {
    if (!active || !hydrated) return;
    // Server action → state sync, scheduled outside the effect body.
    const timer = window.setTimeout(() => void validate(), 0);
    return () => window.clearTimeout(timer);
  }, [active, hydrated, validate]);

  const shown = hydrated ? items : [];
  const lines: CartLineView[] = shown.map((i) => {
    const inf = info[i.sku];
    return {
      sku: i.sku,
      productSlug: i.productSlug,
      name: i.name,
      modelCode: i.modelCode,
      variantLabel: i.variantLabel,
      imageUrl: i.imageUrl,
      priceIdr: i.priceIdr,
      qty: i.qty,
      maxQty: inf ? inf.maxQty : i.isPreorder ? PREORDER_MAX_QTY : i.qty,
      isPreorder: i.isPreorder,
      preorderLeadWeeks: inf?.preorderLeadWeeks ?? (i.isPreorder ? "4-6" : null),
      status: inf?.status ?? (i.isPreorder ? "PREORDER" : "READY"),
    };
  });

  const setQty = React.useCallback(
    (sku: string, qty: number) => {
      const max = info[sku]?.maxQty;
      setQtyStore(sku, max ? Math.min(max, qty) : qty);
    },
    [info, setQtyStore],
  );

  const waHref = buildWaLink(
    "cart",
    { lines: lines.map((l) => ({ name: `${l.name} (${l.modelCode})`, variant: l.variantLabel, qty: l.qty })) },
    locale,
  );

  return {
    hydrated,
    items: shown,
    lines,
    notices,
    subtotalIdr: lines.reduce((n, l) => n + l.priceIdr * l.qty, 0),
    count: lines.reduce((n, l) => n + l.qty, 0),
    hasPreorder: lines.some((l) => l.isPreorder),
    validating,
    validated,
    waHref,
    setQty,
    remove: removeStore,
  };
}
