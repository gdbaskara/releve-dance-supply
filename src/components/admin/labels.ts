/**
 * Admin UI constants: badge tones, display order and enum lists. Client-safe.
 * The visible labels are translations in messages/{id,en}/admin.json (admin supports id/en via the
 * `admin_locale` cookie, docs/10 D-31), keyed by the enum value, e.g. t(`orderStatus.${status}`),
 * t(`transition.${to}`), t(`template.${template}`), t(`linkStatus.${status}`).
 */
import type { MessageTemplate, OrderStatus } from "@/lib/contracts";

export type BadgeTone = "neutral" | "success" | "warning" | "error" | "info" | "accent" | "solid" | "outline";

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
export const ORDER_STATUS_ORDER: readonly OrderStatus[] = [
  "PENDING_PAYMENT", "PAID", "PROCESSING", "SHIPPED", "DELIVERED", "REFUND_PENDING", "CANCELLED", "EXPIRED",
];

/** Statuses that have a verb on the transition control (admin -> next status), see admin.json `transition`. */
export const TRANSITION_TARGETS: readonly OrderStatus[] = ["PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED", "REFUND_PENDING"];

export const TEMPLATE_TONE: Record<MessageTemplate, BadgeTone> = {
  ORDER_CREATED: "neutral",
  PAYMENT_INSTRUCTIONS: "neutral",
  PAYMENT_PAID: "success",
  PAYMENT_EXPIRED: "warning",
  ORDER_SHIPPED: "info",
  ORDER_DELIVERED: "success",
  BACK_IN_STOCK: "accent",
};

export const TEMPLATES: readonly MessageTemplate[] = [
  "ORDER_CREATED", "PAYMENT_INSTRUCTIONS", "PAYMENT_PAID", "PAYMENT_EXPIRED", "ORDER_SHIPPED", "ORDER_DELIVERED", "BACK_IN_STOCK",
];

/** SHP-03 couriers offered when marking an order SHIPPED (brand names, not translated). */
export const COURIERS = ["JNE", "J&T", "SiCepat", "AnterAja", "GoSend", "GrabExpress"] as const;

export const LINK_STATUS_TONE = { ACTIVE: "success", USED: "info", EXPIRED: "neutral" } as const;

export type PaymentStatusTone = "success" | "warning" | "neutral" | "error";

/** Payment statuses with a label in admin.json `paymentStatus`; anything else is shown raw with a neutral tone. */
export const PAYMENT_STATUS_TONE: Record<string, PaymentStatusTone> = {
  PENDING: "warning",
  PAID: "success",
  EXPIRED: "neutral",
  FAILED: "error",
  CANCELLED: "neutral",
};

/** Stock movement reasons with a label in admin.json `stockReason`; unknown reasons are shown raw. */
export const STOCK_REASONS: readonly string[] = ["seed", "admin_adjust", "restock", "order_paid", "order_cancel"];

/** Planning reference for "× MSRP" (docs/06 §1: spot ≈ Rp18.140). */
export const SPOT_USD_IDR = 18_140;
