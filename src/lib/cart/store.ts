"use client";
/**
 * Shared guest cart (CART-05) — persisted to localStorage. Owned by WS-0; used by storefront (WS-3) & checkout (WS-4).
 * Items carry a display snapshot for instant render; ALWAYS re-validate with validateCartAction before showing
 * totals/checkout (server is the source of truth for price & stock).
 */
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export interface CartItem {
  sku: string;
  qty: number;
  productSlug: string;
  name: string;
  modelCode: string;
  variantLabel: string;
  priceIdr: number;
  imageUrl: string | null;
  isPreorder: boolean;
}

interface CartState {
  items: CartItem[];
  drawerOpen: boolean;
  /** set by checkout link flow: items locked to an admin-prepared link */
  add: (item: CartItem, maxQty: number) => void;
  setQty: (sku: string, qty: number) => void;
  remove: (sku: string) => void;
  replaceAll: (items: CartItem[]) => void;
  clear: () => void;
  openDrawer: () => void;
  closeDrawer: () => void;
}

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      drawerOpen: false,
      add: (item, maxQty) =>
        set((s) => {
          const existing = s.items.find((i) => i.sku === item.sku);
          if (existing) {
            return {
              items: s.items.map((i) =>
                i.sku === item.sku ? { ...i, ...item, qty: Math.min(maxQty, i.qty + item.qty) } : i,
              ),
              drawerOpen: true,
            };
          }
          return { items: [...s.items, { ...item, qty: Math.min(maxQty, item.qty) }], drawerOpen: true };
        }),
      setQty: (sku, qty) =>
        set((s) => ({ items: s.items.map((i) => (i.sku === sku ? { ...i, qty: Math.max(1, qty) } : i)) })),
      remove: (sku) => set((s) => ({ items: s.items.filter((i) => i.sku !== sku) })),
      replaceAll: (items) => set({ items }),
      clear: () => set({ items: [] }),
      openDrawer: () => set({ drawerOpen: true }),
      closeDrawer: () => set({ drawerOpen: false }),
    }),
    {
      name: "rds-cart",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ items: s.items }),
    },
  ),
);

export const cartCount = (items: CartItem[]) => items.reduce((n, i) => n + i.qty, 0);
export const toCartInput = (items: CartItem[]) =>
  items.map((i) => ({ sku: i.sku, qty: i.qty, isPreorder: i.isPreorder }));
