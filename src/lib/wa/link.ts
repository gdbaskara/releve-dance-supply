/**
 * wa.me link builders (docs/05 §6). Pure & client-safe — no server-only imports.
 * NEXT_PUBLIC_WA_NUMBER is inlined by Next at build time for client bundles.
 */
import type { Locale, WaLinkContext } from "@/lib/contracts";
import { toWaMeNumber } from "@/lib/format/phone";
import { fillTemplate } from "./templates";

export interface WaCartLine { name: string; variant?: string; qty: number }

/** Variables per buyer → store context */
export interface WaLinkVarsMap {
  pdp: { name: string; modelCode: string; variant?: string; url?: string };
  sizeGuide: { name: string; modelCode: string };
  cart: { lines: WaCartLine[] };
  outsideJava: { province?: string };
  order: { orderNo: string };
  soldOut: { name: string; variant?: string };
  general: Record<string, never> | undefined;
}

const LINK_TEXT: Record<Exclude<WaLinkContext, "cart">, Record<Locale, string>> = {
  pdp: {
    id: "Halo Relevé, saya mau tanya {name} ({model_code}){variant}. {url}",
    en: "Hi Relevé, I'd like to ask about {name} ({model_code}){variant}. {url}",
  },
  sizeGuide: {
    id: "Halo Relevé, saya mau konsultasi ukuran untuk {name} ({model_code}). Panjang kaki saya: … cm",
    en: "Hi Relevé, I'd like a size consultation for {name} ({model_code}). My foot length: … cm",
  },
  outsideJava: {
    id: "Halo Relevé, saya di {province}, apakah bisa kirim ke sini?",
    en: "Hi Relevé, I'm in {province}. Can you ship here?",
  },
  order: {
    id: "Halo Relevé, saya mau tanya pesanan {order_no}.",
    en: "Hi Relevé, I'd like to ask about order {order_no}.",
  },
  soldOut: {
    id: "Halo Relevé, {name} {variant} masih bisa dipesan?",
    en: "Hi Relevé, can I still order {name} {variant}?",
  },
  general: {
    id: "Halo Relevé, saya mau tanya.",
    en: "Hi Relevé, I have a question.",
  },
};

const CART_HEADER: Record<Locale, string> = {
  id: "Halo Relevé, saya mau tanya keranjang saya:",
  en: "Hi Relevé, I'd like to ask about my cart:",
};

const OUTSIDE_JAVA_FALLBACK: Record<Locale, string> = { id: "luar Pulau Jawa", en: "outside Java" };

/** The text that goes into ?text= for a buyer → store context. */
export function buildWaText<C extends WaLinkContext>(context: C, vars: WaLinkVarsMap[C], locale: Locale = "id"): string {
  if (context === "cart") {
    const { lines } = vars as WaLinkVarsMap["cart"];
    const body = lines.map((l) => `- ${[l.name, l.variant].filter(Boolean).join(" ")} ×${l.qty}`).join("\n");
    return `${CART_HEADER[locale]}\n${body}`;
  }
  const v = (vars ?? {}) as Record<string, string | undefined>;
  const tpl = LINK_TEXT[context as Exclude<WaLinkContext, "cart">][locale];
  return fillTemplate(tpl, {
    name: v.name,
    model_code: v.modelCode,
    variant: context === "pdp" ? (v.variant ? ` – ${v.variant}` : "") : v.variant,
    url: v.url,
    order_no: v.orderNo,
    province: v.province || OUTSIDE_JAVA_FALLBACK[locale],
  });
}

export function storeWaNumber(): string {
  return toWaMeNumber(process.env.NEXT_PUBLIC_WA_NUMBER ?? "");
}

/** Buyer → store: https://wa.me/<NEXT_PUBLIC_WA_NUMBER>?text=… */
export function buildWaLink<C extends WaLinkContext>(context: C, vars: WaLinkVarsMap[C], locale: Locale = "id"): string {
  return `https://wa.me/${storeWaNumber()}?text=${encodeURIComponent(buildWaText(context, vars, locale))}`;
}

/** Admin → buyer: https://wa.me/<customer digits>?text=… (customer in E.164, e.g. +6281234567890) */
export function buildWaLinkTo(customerE164: string, text: string): string {
  return `https://wa.me/${toWaMeNumber(customerE164)}?text=${encodeURIComponent(text)}`;
}
