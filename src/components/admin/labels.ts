/** Admin UI labels (Bahasa Indonesia only — admin is not localised, see docs/10 D-WS5). Client-safe. */
import type { MessageTemplate, OrderStatus, StockStatus } from "@/lib/contracts";

export type BadgeTone = "neutral" | "success" | "warning" | "error" | "info" | "accent" | "solid" | "outline";

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING_PAYMENT: "Menunggu bayar",
  PAID: "Dibayar",
  PROCESSING: "Diproses",
  SHIPPED: "Dikirim",
  DELIVERED: "Selesai",
  EXPIRED: "Kedaluwarsa",
  CANCELLED: "Dibatalkan",
  REFUND_PENDING: "Menunggu refund",
};

export const ORDER_STATUS_TONE: Record<OrderStatus, BadgeTone> = {
  PENDING_PAYMENT: "warning",
  PAID: "info",
  PROCESSING: "outline",
  SHIPPED: "solid",
  DELIVERED: "success",
  EXPIRED: "neutral",
  CANCELLED: "neutral",
  REFUND_PENDING: "error",
};

/** Order of the status filter chips on /admin/orders. */
export const ORDER_STATUS_ORDER: OrderStatus[] = [
  "PENDING_PAYMENT", "PAID", "PROCESSING", "SHIPPED", "DELIVERED", "REFUND_PENDING", "CANCELLED", "EXPIRED",
];

/** Verb used on the transition control (admin → next status). */
export const TRANSITION_LABEL: Partial<Record<OrderStatus, string>> = {
  PROCESSING: "Proses pesanan",
  SHIPPED: "Kirim (input resi)",
  DELIVERED: "Tandai terkirim",
  CANCELLED: "Batalkan pesanan",
  REFUND_PENDING: "Batalkan & refund",
};

export const STOCK_STATUS_LABEL: Record<StockStatus, string> = {
  READY: "Ready",
  LOW: "Stok rendah",
  PREORDER: "Pre-order",
  SOLD_OUT: "Habis",
};

export const TEMPLATE_LABEL: Record<MessageTemplate, string> = {
  ORDER_CREATED: "Order dibuat",
  PAYMENT_INSTRUCTIONS: "Instruksi bayar",
  PAYMENT_PAID: "Pembayaran diterima",
  PAYMENT_EXPIRED: "Pembayaran kedaluwarsa",
  ORDER_SHIPPED: "Dikirim",
  ORDER_DELIVERED: "Terkirim",
  BACK_IN_STOCK: "Stok ready lagi",
};

export const TEMPLATE_TONE: Record<MessageTemplate, BadgeTone> = {
  ORDER_CREATED: "neutral",
  PAYMENT_INSTRUCTIONS: "neutral",
  PAYMENT_PAID: "success",
  PAYMENT_EXPIRED: "warning",
  ORDER_SHIPPED: "info",
  ORDER_DELIVERED: "success",
  BACK_IN_STOCK: "accent",
};

export const TEMPLATES: MessageTemplate[] = [
  "ORDER_CREATED", "PAYMENT_INSTRUCTIONS", "PAYMENT_PAID", "PAYMENT_EXPIRED", "ORDER_SHIPPED", "ORDER_DELIVERED", "BACK_IN_STOCK",
];

/** SHP-03 couriers offered when marking an order SHIPPED. */
export const COURIERS = ["JNE", "J&T", "SiCepat", "AnterAja", "GoSend", "GrabExpress"] as const;

export const LINK_STATUS_LABEL = { ACTIVE: "Aktif", USED: "Terpakai", EXPIRED: "Kedaluwarsa" } as const;
export const LINK_STATUS_TONE = { ACTIVE: "success", USED: "info", EXPIRED: "neutral" } as const;

/** Planning reference for "× MSRP" (docs/06 §1: spot ≈ Rp18.140). */
export const SPOT_USD_IDR = 18_140;
