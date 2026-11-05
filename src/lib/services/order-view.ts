/** Builds OrderPublicView (contracts) from DB rows. Server-only. */
import { desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { orderItems, orders, payments, products, variants } from "@/db/schema";
import { imageForColor } from "@/lib/utils/image-for-color";
import type {
  Locale,
  OrderPublicView,
  OrderStatus,
  OrderTimelineEntry,
  PaymentChannel,
  PaymentMethod,
  ProductImage,
} from "@/lib/contracts";
import { maskPhoneID } from "@/lib/format/phone";
import type { DbOrTx } from "./db-types";

export type OrderRow = typeof orders.$inferSelect;
export type PaymentRow = typeof payments.$inferSelect;
export type OrderItemRow = typeof orderItems.$inferSelect;

export function buildTimeline(o: OrderRow): OrderTimelineEntry[] {
  const main: OrderTimelineEntry[] = [
    { status: "PENDING_PAYMENT", at: o.createdAt, done: true },
    { status: "PAID", at: o.paidAt, done: !!o.paidAt },
    { status: "PROCESSING", at: o.processingAt, done: !!o.processingAt },
    { status: "SHIPPED", at: o.shippedAt, done: !!o.shippedAt, note: o.tracking ? `${o.tracking.courier} ${o.tracking.awb}` : undefined },
    { status: "DELIVERED", at: o.deliveredAt, done: !!o.deliveredAt },
  ];
  const s = o.status as OrderStatus;
  if (s === "EXPIRED") return [main[0], { status: "EXPIRED", at: o.updatedAt, done: true }];
  if (s === "REFUND_PENDING" || (s === "CANCELLED" && o.paidAt)) {
    const extra: OrderTimelineEntry[] = [{ status: "REFUND_PENDING", at: s === "REFUND_PENDING" ? o.updatedAt : null, done: true }];
    if (s === "CANCELLED") extra.push({ status: "CANCELLED", at: o.cancelledAt, done: true });
    return [...main.filter((e) => e.done), ...extra];
  }
  if (s === "CANCELLED") return [main[0], { status: "CANCELLED", at: o.cancelledAt, done: true }];
  return main;
}

export async function loadOrderBundle(orderNo: string, conn: DbOrTx = db) {
  const [o] = await conn.select().from(orders).where(eq(orders.orderNo, orderNo.trim().toUpperCase())).limit(1);
  if (!o) return null;
  const [items, pays] = await Promise.all([
    conn.select().from(orderItems).where(eq(orderItems.orderId, o.id)),
    conn.select().from(payments).where(eq(payments.orderId, o.id)).orderBy(desc(payments.createdAt)),
  ]);
  const skus = [...new Set(items.map((i) => i.sku))];
  const imgs = skus.length
    ? await conn
        .select({ sku: variants.sku, color: variants.color, images: products.images })
        .from(variants)
        .innerJoin(products, eq(products.id, variants.productId))
        .where(inArray(variants.sku, skus))
    : [];
  // Keyed by SKU so each line shows the photo of the colour that was ordered.
  const imageMap = new Map(imgs.map((r) => [r.sku, imageForColor((r.images ?? []) as ProductImage[], r.color)?.url ?? null]));
  return { order: o, items, payments: pays, imageMap };
}

export type OrderBundle = NonNullable<Awaited<ReturnType<typeof loadOrderBundle>>>;

export function toPaymentView(p: PaymentRow | undefined): OrderPublicView["payment"] {
  if (!p) return null;
  return {
    method: p.method as PaymentMethod,
    channel: (p.channel ?? undefined) as PaymentChannel | undefined,
    status: p.status,
    expiresAt: p.expiresAt,
    qrString: p.qrString ?? undefined,
    vaNumber: p.vaNumber ?? undefined,
    redirectUrl: p.redirectUrl ?? undefined,
  };
}

export function buildOrderView(b: OrderBundle): OrderPublicView {
  const o = b.order;
  return {
    orderNo: o.orderNo,
    status: o.status as OrderStatus,
    locale: o.locale as Locale,
    customerName: o.customerName,
    customerWaMasked: maskPhoneID(o.customerWa),
    items: b.items.map((i) => ({
      name: i.nameSnapshot,
      variantLabel: i.variantLabel,
      qty: i.qty,
      priceIdr: i.priceIdr,
      isPreorder: i.isPreorder,
      imageUrl: b.imageMap.get(i.sku) ?? null,
    })),
    subtotalIdr: o.subtotalIdr,
    shippingIdr: o.shippingIdr,
    insuranceIdr: o.insuranceIdr,
    discountIdr: o.discountIdr,
    totalIdr: o.totalIdr,
    shipping: {
      courier: o.shipping.courier,
      service: o.shipping.service,
      type: o.shipping.type,
      eta: o.shipping.eta,
      etaUnit: o.shipping.etaUnit,
    },
    address: o.address,
    hasPreorder: o.hasPreorder,
    payment: toPaymentView(b.payments[0]),
    tracking: o.tracking
      ? {
          courier: o.tracking.courier,
          awb: o.tracking.awb,
          shippedAt: o.tracking.shippedAt ? new Date(o.tracking.shippedAt) : null,
          deliveredAt: o.tracking.deliveredAt ? new Date(o.tracking.deliveredAt) : null,
        }
      : null,
    timeline: buildTimeline(o),
    createdAt: o.createdAt,
    paidAt: o.paidAt,
  };
}
