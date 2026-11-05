/**
 * Database schema — docs/05-data-and-contracts.md §1. Money = integer Rupiah. Times = timestamptz (UTC).
 * Changing this file is a contract change (separate PR).
 */
import { sql } from "drizzle-orm";
import {
  pgTable, pgEnum, text, integer, boolean, timestamp, jsonb, numeric, uuid, index, uniqueIndex, check,
} from "drizzle-orm/pg-core";
import type { Address, ProductImage } from "@/lib/contracts";

export const disciplineEnum = pgEnum("discipline", [
  "Ballet", "Pointe", "Jazz", "Tap", "Character", "Latin/Ballroom", "Contemporary",
  "Leotards", "Skirts", "Tops", "Tights",
]);
export const audienceEnum = pgEnum("audience", ["Adult", "Kids", "Men"]);
export const priceGroupEnum = pgEnum("price_group", ["pointe", "shoes", "apparel", "tights"]);
export const orderStatusEnum = pgEnum("order_status", [
  "PENDING_PAYMENT", "PAID", "PROCESSING", "SHIPPED", "DELIVERED", "EXPIRED", "CANCELLED", "REFUND_PENDING",
]);
export const localeEnum = pgEnum("locale", ["id", "en"]);
export const paymentMethodEnum = pgEnum("payment_method", ["QRIS", "EWALLET", "VA", "CARD"]);
export const paymentStatusEnum = pgEnum("payment_status", ["PENDING", "PAID", "EXPIRED", "FAILED", "CANCELLED"]);
export const movementReasonEnum = pgEnum("movement_reason", [
  "seed", "admin_adjust", "order_paid", "order_cancel", "restock",
]);
export const messageTemplateEnum = pgEnum("message_template", [
  "ORDER_CREATED", "PAYMENT_PAID", "PAYMENT_EXPIRED", "ORDER_SHIPPED", "ORDER_DELIVERED",
  "BACK_IN_STOCK", "PAYMENT_INSTRUCTIONS",
]);
export const outboxStatusEnum = pgEnum("outbox_status", ["QUEUED", "SENT", "FAILED"]);
export const voucherTypeEnum = pgEnum("voucher_type", ["percent", "fixed"]);

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
};

export const products = pgTable("products", {
  id: text("id").primaryKey(), // = slug
  modelCode: text("model_code").notNull(),
  name: text("name").notNull(),
  brand: text("brand").notNull().default("Só Dança"),
  discipline: disciplineEnum("discipline").notNull(),
  audience: audienceEnum("audience").notNull(),
  group: priceGroupEnum("group").notNull(),
  priceIdr: integer("price_idr").notNull(),
  msrpUsd: numeric("msrp_usd", { precision: 8, scale: 2 }).notNull(),
  landedCostIdr: integer("landed_cost_idr").notNull(),
  descriptionEn: text("description_en").notNull().default(""),
  descriptionId: text("description_id"),
  featuresId: text("features_id").array().notNull().default(sql`'{}'::text[]`),
  featuresEn: text("features_en").array().notNull().default(sql`'{}'::text[]`),
  colors: text("colors").array().notNull().default(sql`'{}'::text[]`),
  widths: text("widths").array().notNull().default(sql`'{}'::text[]`),
  options: text("options").array().notNull().default(sql`'{}'::text[]`),
  images: jsonb("images").$type<ProductImage[]>().notNull().default([]),
  referenceImageUrl: text("reference_image_url"),
  sortOrder: integer("sort_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  ...timestamps,
}, (t) => [index("products_discipline_idx").on(t.discipline)]);

export const variants = pgTable("variants", {
  sku: text("sku").primaryKey(),
  productId: text("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  color: text("color"),
  size: text("size"),
  width: text("width"),
  shank: text("shank"),
  sortOrder: integer("sort_order").notNull().default(0),
  weightGrams: integer("weight_grams").notNull(),
  onHand: integer("on_hand").notNull().default(0),
  reserved: integer("reserved").notNull().default(0),
  preorderEnabled: boolean("preorder_enabled").notNull().default(false),
  preorderLeadWeeks: text("preorder_lead_weeks"),
  ...timestamps,
}, (t) => [
  index("variants_product_idx").on(t.productId),
  check("on_hand_nonneg", sql`${t.onHand} >= 0`),
  check("reserved_valid", sql`${t.reserved} >= 0 AND ${t.reserved} <= ${t.onHand}`),
]);

export const stockMovements = pgTable("stock_movements", {
  id: uuid("id").primaryKey().defaultRandom(),
  sku: text("sku").notNull().references(() => variants.sku),
  delta: integer("delta").notNull(),
  reason: movementReasonEnum("reason").notNull(),
  ref: text("ref"),
  actor: text("actor").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type ShippingSnapshot = {
  serviceCode: string; courier: string; service: string; type: "instant" | "express" | "regular";
  priceIdr: number; eta: string; etaUnit: "days" | "hours"; insured: boolean;
};
export type TrackingInfo = { courier: string; awb: string; shippedAt: string | null; deliveredAt: string | null };

export const checkoutLinks = pgTable("checkout_links", {
  id: uuid("id").primaryKey().defaultRandom(),
  token: text("token").notNull().unique(),
  items: jsonb("items").$type<{ sku: string; qty: number }[]>().notNull(),
  customerName: text("customer_name"),
  customerWa: text("customer_wa"),
  createdBy: text("created_by").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  usedOrderId: uuid("used_order_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const orders = pgTable("orders", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderNo: text("order_no").notNull().unique(),
  status: orderStatusEnum("status").notNull().default("PENDING_PAYMENT"),
  locale: localeEnum("locale").notNull().default("id"),
  customerName: text("customer_name").notNull(),
  customerWa: text("customer_wa").notNull(),
  customerEmail: text("customer_email"),
  waOptIn: boolean("wa_opt_in").notNull().default(true),
  address: jsonb("address").$type<Address>().notNull(),
  shipping: jsonb("shipping").$type<ShippingSnapshot>().notNull(),
  subtotalIdr: integer("subtotal_idr").notNull(),
  shippingIdr: integer("shipping_idr").notNull(),
  insuranceIdr: integer("insurance_idr").notNull().default(0),
  discountIdr: integer("discount_idr").notNull().default(0),
  totalIdr: integer("total_idr").notNull(),
  voucherCode: text("voucher_code"),
  checkoutLinkId: uuid("checkout_link_id").references(() => checkoutLinks.id),
  hasPreorder: boolean("has_preorder").notNull().default(false),
  tracking: jsonb("tracking").$type<TrackingInfo>(),
  paidAt: timestamp("paid_at", { withTimezone: true }),
  processingAt: timestamp("processing_at", { withTimezone: true }),
  shippedAt: timestamp("shipped_at", { withTimezone: true }),
  deliveredAt: timestamp("delivered_at", { withTimezone: true }),
  cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  ...timestamps,
}, (t) => [index("orders_status_idx").on(t.status), index("orders_created_idx").on(t.createdAt)]);

export const orderItems = pgTable("order_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  sku: text("sku").notNull().references(() => variants.sku),
  productId: text("product_id").notNull(),
  nameSnapshot: text("name_snapshot").notNull(),
  variantLabel: text("variant_label").notNull(),
  priceIdr: integer("price_idr").notNull(),
  qty: integer("qty").notNull(),
  isPreorder: boolean("is_preorder").notNull().default(false),
}, (t) => [index("order_items_order_idx").on(t.orderId)]);

export const stockReservations = pgTable("stock_reservations", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  sku: text("sku").notNull().references(() => variants.sku),
  qty: integer("qty").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  releasedAt: timestamp("released_at", { withTimezone: true }),
  consumedAt: timestamp("consumed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("reservations_order_idx").on(t.orderId)]);

export const payments = pgTable("payments", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  provider: text("provider").notNull(),
  method: paymentMethodEnum("method").notNull(),
  channel: text("channel"),
  status: paymentStatusEnum("status").notNull().default("PENDING"),
  amountIdr: integer("amount_idr").notNull(),
  providerRef: text("provider_ref").notNull(),
  qrString: text("qr_string"),
  vaNumber: text("va_number"),
  redirectUrl: text("redirect_url"),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  paidAt: timestamp("paid_at", { withTimezone: true }),
  raw: jsonb("raw"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("payments_order_idx").on(t.orderId), uniqueIndex("payments_ref_idx").on(t.provider, t.providerRef)]);

export const paymentEvents = pgTable("payment_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  provider: text("provider").notNull(),
  eventId: text("event_id").notNull().unique(),
  payload: jsonb("payload"),
  processedAt: timestamp("processed_at", { withTimezone: true }).notNull().defaultNow(),
});

export const backInStockRequests = pgTable("back_in_stock_requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  sku: text("sku").notNull().references(() => variants.sku),
  customerWa: text("customer_wa").notNull(),
  locale: localeEnum("locale").notNull().default("id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  notifiedAt: timestamp("notified_at", { withTimezone: true }),
}, (t) => [index("bis_sku_idx").on(t.sku)]);

export const waOutbox = pgTable("wa_outbox", {
  id: uuid("id").primaryKey().defaultRandom(),
  toWa: text("to_wa").notNull(),
  template: messageTemplateEnum("template").notNull(),
  locale: localeEnum("locale").notNull().default("id"),
  body: text("body").notNull(),
  orderId: uuid("order_id"),
  status: outboxStatusEnum("status").notNull().default("SENT"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const vouchers = pgTable("vouchers", {
  code: text("code").primaryKey(),
  type: voucherTypeEnum("type").notNull(),
  value: integer("value").notNull(),
  minSubtotalIdr: integer("min_subtotal_idr").notNull().default(0),
  active: boolean("active").notNull().default(true),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
});

export const adminUsers = pgTable("admin_users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull(),
});
