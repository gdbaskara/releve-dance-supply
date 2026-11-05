"use client";

import * as React from "react";
import { useCart, type CartItem } from "@/lib/cart/store";
import type { CartLineView } from "@/lib/contracts";

/** true once the persisted cart (localStorage `rds-cart`) has been read. */
export function useCartHydrated(): boolean {
  return React.useSyncExternalStore(
    (cb) => useCart.persist.onFinishHydration(cb),
    () => useCart.persist.hasHydrated(),
    () => false,
  );
}

/** CSS media query as a hook (false during SSR). */
export function useMediaQuery(query: string): boolean {
  return React.useSyncExternalStore(
    (cb) => {
      const mql = window.matchMedia(query);
      mql.addEventListener("change", cb);
      return () => mql.removeEventListener("change", cb);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}

/** Server-validated line → cart store item (keeps the local cart in sync with stock & price). */
export function lineToCartItem(l: CartLineView): CartItem {
  return {
    sku: l.sku,
    qty: l.qty,
    productSlug: l.productSlug,
    name: l.name,
    modelCode: l.modelCode,
    variantLabel: l.variantLabel,
    priceIdr: l.priceIdr,
    imageUrl: l.imageUrl,
    isPreorder: l.isPreorder,
  };
}

/** "4-6" → "4–6" */
export const dashRange = (s: string | null | undefined) => (s ?? "4-6").replace("-", "–");
