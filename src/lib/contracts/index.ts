/**
 * Shared contracts — see docs/05-data-and-contracts.md.
 * Changing anything here requires a separate, small PR (AGENTS.md / docs/09-work-plan.md).
 * NOTE: there is intentionally NO cash-on-delivery anything in this codebase.
 */

export type Locale = "id" | "en";

// Catalog

export type Discipline =
  | "Ballet" | "Pointe" | "Jazz" | "Tap" | "Character" | "Latin/Ballroom" | "Contemporary"
  | "Leotards" | "Skirts" | "Tops" | "Tights";

export type Audience = "Adult" | "Kids" | "Men";
export type PriceGroup = "pointe" | "shoes" | "apparel" | "tights";
export type VariantOption = "Color" | "Size" | "Width" | "Shank";

/** URL slug for each discipline listing: /[locale]/c/[slug] */
export const DISCIPLINE_SLUGS: Record<string, Discipline> = {
  ballet: "Ballet",
  pointe: "Pointe",
  jazz: "Jazz",
  tap: "Tap",
  character: "Character",
  "latin-ballroom": "Latin/Ballroom",
  contemporary: "Contemporary",
  leotards: "Leotards",
  skirts: "Skirts",
  tops: "Tops",
  tights: "Tights",
};

/** Aggregate listings */
export const COLLECTIONS = {
  shoes: ["Ballet", "Pointe", "Jazz", "Tap", "Character", "Latin/Ballroom", "Contemporary"] as Discipline[],
  dancewear: ["Leotards", "Skirts", "Tops", "Tights"] as Discipline[],
  kids: "Kids" as const, // audience filter
};

export type StockStatus = "READY" | "LOW" | "PREORDER" | "SOLD_OUT";
export const LOW_STOCK_THRESHOLD = 3;
export const PREORDER_MAX_QTY = 5;

export function deriveStockStatus(available: number, preorderEnabled: boolean): StockStatus {
  if (available > LOW_STOCK_THRESHOLD) return "READY";
  if (available > 0) return "LOW";
  return preorderEnabled ? "PREORDER" : "SOLD_OUT";
}

export function aggregateStockStatus(statuses: StockStatus[]): StockStatus {
  if (statuses.some((s) => s === "READY" || s === "LOW")) return "READY";
  if (statuses.some((s) => s === "PREORDER")) return "PREORDER";
  return "SOLD_OUT";
}

export interface ProductImage { url: string; alt: string; color?: string }

export interface VariantView {
  sku: string;
  color: string | null;
  size: string | null;
  width: string | null;
  shank: string | null;
  available: number;
  status: StockStatus;
  preorderLeadWeeks: string | null;
  weightGrams: number;
}

export interface ProductSummary {
  id: string;            // = slug
  slug: string;
  modelCode: string;
  name: string;
  brand: string;
  discipline: Discipline;
  audience: Audience;
  priceIdr: number;
  colors: string[];
  status: StockStatus;   // aggregate
  image: ProductImage | null;
  /** Listing colour filter: the filtered colour the card photo shows (PDP link pre-selects it). */
  matchedColor?: string | null;
  /** Card colour preview: colour -> its first photo (only colours that have one). */
  colorImages?: Record<string, ProductImage>;
}

export interface ProductDetail extends ProductSummary {
  group: PriceGroup;
  options: VariantOption[];
  widths: string[];
  descriptionEn: string;
  descriptionId: string | null;
  featuresId: string[];
  featuresEn: string[];
  images: ProductImage[];
  variants: VariantView[];
}

export type SortKey = "newest" | "price_asc" | "price_desc";

export interface CatalogFilters {
  disciplines?: Discipline[];
  audience?: Audience[];
  sizes?: string[];
  widths?: string[];
  colors?: string[];
  minPrice?: number;
  maxPrice?: number;
  availability?: ("READY" | "PREORDER")[];
  q?: string;
  sort?: SortKey;
  page?: number;      // 1-based
  pageSize?: number;  // default 24
}

export interface Facet { value: string; count: number }
export interface CatalogResult {
  items: ProductSummary[];
  total: number;
  page: number;
  pageSize: number;
  facets: { discipline: Facet[]; audience: Facet[]; size: Facet[]; width: Facet[]; color: Facet[] };
  priceRange: { min: number; max: number };
}

// Cart / checkout

export interface CartItemInput { sku: string; qty: number }

export interface CartLineView {
  sku: string;
  productSlug: string;
  name: string;
  modelCode: string;
  variantLabel: string;   // "Ballet Pink · 7.5 · M"
  imageUrl: string | null;
  priceIdr: number;
  qty: number;
  maxQty: number;
  isPreorder: boolean;
  preorderLeadWeeks: string | null;
  status: StockStatus;
}

export type CartNotice =
  | { type: "QTY_REDUCED"; sku: string; from: number; to: number }
  | { type: "REMOVED_SOLD_OUT"; sku: string }
  | { type: "NOW_PREORDER"; sku: string }
  | { type: "UNKNOWN_SKU"; sku: string };

export interface ValidatedCart {
  lines: CartLineView[];
  notices: CartNotice[];
  subtotalIdr: number;
  weightGrams: number;
  hasPreorder: boolean;
}

export type JavaProvince =
  | "DKI Jakarta" | "Banten" | "Jawa Barat" | "Jawa Tengah" | "DI Yogyakarta" | "Jawa Timur";
export type ShippingZone = "Z1" | "Z2" | "Z3" | "Z4";

export interface Address {
  province: JavaProvince;
  city: string;
  district: string;
  postalCode: string; // 5 digits
  line: string;
  note?: string;
  zone: ShippingZone; // derived server-side from data/shipping/java-areas.json
}

export interface Contact {
  name: string;
  wa: string;        // E.164 +62…
  email?: string;
  waOptIn: boolean;
}

// Payment

export type PaymentMethod = "QRIS" | "EWALLET" | "VA" | "CARD"; // NO cash-on-delivery, NO installments (v1)
export type EwalletChannel = "GOPAY" | "OVO" | "DANA" | "SHOPEEPAY";
export type VaChannel = "BCA" | "MANDIRI" | "BNI" | "BRI" | "PERMATA";
export type PaymentChannel = EwalletChannel | VaChannel;

/** Display order of payment tiles (docs/05 §5) */
export const PAYMENT_OPTIONS: { method: PaymentMethod; channel?: PaymentChannel }[] = [
  { method: "QRIS" },
  { method: "EWALLET", channel: "GOPAY" },
  { method: "EWALLET", channel: "OVO" },
  { method: "EWALLET", channel: "DANA" },
  { method: "EWALLET", channel: "SHOPEEPAY" },
  { method: "VA", channel: "BCA" },
  { method: "VA", channel: "MANDIRI" },
  { method: "VA", channel: "BNI" },
  { method: "VA", channel: "BRI" },
  { method: "VA", channel: "PERMATA" },
  { method: "CARD" },
];

/** Payment validity in minutes */
export const PAYMENT_EXPIRY_MINUTES: Record<PaymentMethod, number> = {
  QRIS: 30,
  EWALLET: 15,
  VA: 24 * 60,
  CARD: 15,
};
export const RESERVATION_GRACE_MINUTES = 5;

export interface CreatePaymentInput {
  orderId: string;
  orderNo: string;
  amountIdr: number;
  method: PaymentMethod;
  channel?: PaymentChannel;
  customer: { name: string; wa: string; email?: string };
  successRedirectUrl: string;
}

export interface PaymentInstruction {
  providerRef: string;
  method: PaymentMethod;
  channel?: PaymentChannel;
  expiresAt: Date;
  qrString?: string;
  vaNumber?: string;
  redirectUrl?: string;
}

export interface PaymentWebhookResult {
  eventId: string;
  providerRef: string;
  status: "PAID" | "EXPIRED" | "FAILED";
  paidAt?: Date;
  raw: unknown;
}

export interface PaymentProvider {
  readonly name: "mock" | "xendit";
  createPayment(input: CreatePaymentInput): Promise<PaymentInstruction>;
  cancelPayment(providerRef: string): Promise<void>;
  verifyAndParseWebhook(req: Request): Promise<PaymentWebhookResult>;
}

// Shipping

export type ShippingType = "instant" | "express" | "regular";

export interface ShippingRateRequest {
  destination: { province: JavaProvince; city: string; zone: ShippingZone; postalCode: string };
  weightGrams: number;
  itemValueIdr: number;
  now: Date;
}

export interface ShippingRate {
  serviceCode: string;
  courier: string;
  service: string;
  type: ShippingType;
  priceIdr: number;
  insuranceIdr: number;
  eta: string;       // "1-2" (days) or "1-3" (hours) — see etaUnit
  etaUnit: "days" | "hours";
  cutoff?: string;   // "16:00 WIB" for instant
}

export interface ShippingProvider {
  readonly name: "mock" | "biteship";
  getRates(req: ShippingRateRequest): Promise<ShippingRate[]>;
  getTracking?(courier: string, awb: string): Promise<{ status: string; at: Date; note?: string }[]>;
}

// Messaging (WhatsApp)

export type MessageTemplate =
  | "ORDER_CREATED" | "PAYMENT_PAID" | "PAYMENT_EXPIRED" | "ORDER_SHIPPED"
  | "ORDER_DELIVERED" | "BACK_IN_STOCK" | "PAYMENT_INSTRUCTIONS" | "LOW_STOCK_ALERT";

export interface MessagingProvider {
  readonly name: "outbox" | "waba";
  send(to: string, template: MessageTemplate, locale: Locale, vars: Record<string, string>, orderId?: string): Promise<void>;
}

/** Contexts for buyer → store wa.me links (docs/05 §6) */
export type WaLinkContext = "pdp" | "sizeGuide" | "cart" | "outsideJava" | "order" | "soldOut" | "general";

// Orders

export type OrderStatus =
  | "PENDING_PAYMENT" | "PAID" | "PROCESSING" | "SHIPPED" | "DELIVERED"
  | "EXPIRED" | "CANCELLED" | "REFUND_PENDING";

export const ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING_PAYMENT: ["PAID", "EXPIRED", "CANCELLED"],
  PAID: ["PROCESSING", "REFUND_PENDING"],
  PROCESSING: ["SHIPPED", "REFUND_PENDING"],
  SHIPPED: ["DELIVERED"],
  DELIVERED: [],
  EXPIRED: [],
  CANCELLED: [],
  REFUND_PENDING: ["CANCELLED"],
};

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return ORDER_TRANSITIONS[from].includes(to);
}

export interface CreateOrderInput {
  locale: Locale;
  contact: Contact;
  address: Omit<Address, "zone">;
  shippingServiceCode: string;
  insured: boolean;
  method: PaymentMethod;
  channel?: PaymentChannel;
  items: CartItemInput[];
  voucherCode?: string;
  checkoutLinkToken?: string;
}

export type CreateOrderResult =
  | { ok: true; orderNo: string; payUrl: string }
  | { ok: false; error: "OUT_OF_STOCK"; skus: string[] }
  | { ok: false; error: "INVALID_INPUT" | "INVALID_VOUCHER" | "INVALID_SHIPPING" | "LINK_EXPIRED" | "OUTSIDE_JAVA"; message?: string };

export interface OrderTimelineEntry { status: OrderStatus; at: Date | null; done: boolean; note?: string }

export interface OrderPublicView {
  orderNo: string;
  status: OrderStatus;
  locale: Locale;
  customerName: string;
  customerWaMasked: string; // +62 812-•••-7890
  items: { name: string; variantLabel: string; qty: number; priceIdr: number; isPreorder: boolean; imageUrl: string | null }[];
  subtotalIdr: number;
  shippingIdr: number;
  insuranceIdr: number;
  discountIdr: number;
  totalIdr: number;
  shipping: { courier: string; service: string; type: ShippingType; eta: string; etaUnit: "days" | "hours" };
  address: Address;
  hasPreorder: boolean;
  payment: {
    method: PaymentMethod;
    channel?: PaymentChannel;
    status: "PENDING" | "PAID" | "EXPIRED" | "FAILED" | "CANCELLED";
    expiresAt: Date;
    qrString?: string;
    vaNumber?: string;
    redirectUrl?: string;
  } | null;
  tracking: { courier: string; awb: string; shippedAt: Date | null; deliveredAt: Date | null } | null;
  timeline: OrderTimelineEntry[];
  createdAt: Date;
  paidAt: Date | null;
}
