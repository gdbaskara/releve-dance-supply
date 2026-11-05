/**
 * 12 sample orders over the last 10 days across all statuses, with payments, reservations and WA outbox rows.
 * Historical (paid) orders do NOT touch on_hand (the seeded stock is "after" those sales);
 * PENDING_PAYMENT orders hold real reservations (reserved += qty).
 */
import { randomInt } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import type { DB } from "@/db";
import { orderItems, orders, payments, stockReservations, variants, waOutbox } from "@/db/schema";
import {
  PAYMENT_EXPIRY_MINUTES,
  RESERVATION_GRACE_MINUTES,
  type Address,
  type JavaProvince,
  type Locale,
  type MessageTemplate,
  type OrderStatus,
  type PaymentChannel,
  type PaymentMethod,
} from "@/lib/contracts";
import { resolveZone } from "@/lib/data/areas";
import { MockShippingProvider } from "@/lib/providers/shipping/mock";
import { VA_PREFIX } from "@/lib/providers/payment/mock";
import { renderNotification } from "@/lib/wa/templates";
import { generateOrderNo } from "@/lib/services/order";
import { orderVars } from "@/lib/services/notify";
import { variantLabel } from "@/lib/services/labels";
import { computeDiscount } from "@/lib/services/voucher";

interface SeedOrderSpec {
  status: OrderStatus;
  name: string;
  wa: string;
  email?: string;
  optIn?: boolean;
  locale?: Locale;
  address: Omit<Address, "zone">;
  /** hours before now the order was created */
  agoHours: number;
  items: { product: string; pick: number; qty: number; preorder?: boolean }[];
  method: PaymentMethod;
  channel?: PaymentChannel;
  service: string;
  voucher?: boolean;
  awb?: string;
}

const H = 3_600_000;

const SPECS: SeedOrderSpec[] = [
  {
    status: "PENDING_PAYMENT", name: "Anindya Putri", wa: "+6281234567801", email: "anindya.putri@example.com",
    address: { province: "DKI Jakarta", city: "Kota Jakarta Selatan", district: "Kebayoran Baru", postalCode: "12160", line: "Jl. Senopati No. 21, RT 04/RW 02" },
    agoHours: 0.1, items: [{ product: "diamond-sd140", pick: 3, qty: 1 }], method: "QRIS", service: "gosend_instant",
  },
  {
    status: "PENDING_PAYMENT", name: "Rizky Pratama", wa: "+6285711223344",
    address: { province: "Jawa Barat", city: "Kota Bandung", district: "Coblong", postalCode: "40132", line: "Jl. Dago Asri II No. 8", note: "Pagar hitam, titip satpam" },
    agoHours: 3, items: [{ product: "diamond-sd140-kids", pick: 5, qty: 1 }, { product: "sloane-kid-s-top-sl220-kids", pick: 1, qty: 1 }],
    method: "VA", channel: "BCA", service: "jne_reg",
  },
  {
    status: "PAID", name: "Sekar Ayu Larasati", wa: "+6281328765432", locale: "id",
    address: { province: "DI Yogyakarta", city: "Kota Yogyakarta", district: "Gondokusuman", postalCode: "55223", line: "Jl. Cik Di Tiro No. 14" },
    agoHours: 20, items: [{ product: "alina-iv-pointe-shoe-p95", pick: 2, qty: 1 }], method: "EWALLET", channel: "GOPAY", service: "jne_yes",
  },
  {
    status: "PAID", name: "Maria Clara Wijaya", wa: "+6287853219876", email: "maria.wijaya@example.com", locale: "en",
    address: { province: "Jawa Timur", city: "Kota Surabaya", district: "Gubeng", postalCode: "60281", line: "Jl. Raya Darmo Permai III No. 5" },
    agoHours: 44, items: [{ product: "farfalla-sl243", pick: 1, qty: 1 }, { product: "adult-shimmer-footed-tights-ts102", pick: 0, qty: 2 }],
    method: "VA", channel: "MANDIRI", service: "sicepat_reg", voucher: true,
  },
  {
    status: "PAID", name: "Nadia Rahmawati", wa: "+6281511122233", optIn: false,
    address: { province: "Banten", city: "Kota Tangerang Selatan", district: "Serpong", postalCode: "15310", line: "Cluster Anggrek Loka Blok C2 No. 7, BSD" },
    agoHours: 28, items: [{ product: "jive-iii-bl302", pick: 2, qty: 1 }], method: "CARD", service: "anteraja_nd",
  },
  {
    status: "PROCESSING", name: "Dewi Kartika Sari", wa: "+6282134455667",
    address: { province: "Jawa Tengah", city: "Kota Semarang", district: "Candisari", postalCode: "50257", line: "Jl. Sisingamangaraja No. 30" },
    agoHours: 70, items: [{ product: "claudia-satin-sd09", pick: 4, qty: 2 }], method: "QRIS", service: "jne_reg",
  },
  {
    status: "PROCESSING", name: "Fransiska Halim", wa: "+6281977788899", email: "fransiska.h@example.com",
    address: { province: "DKI Jakarta", city: "Kota Jakarta Barat", district: "Kebon Jeruk", postalCode: "11530", line: "Jl. Kebon Jeruk Raya No. 45, Apartemen Menara 2 Lt. 9" },
    agoHours: 50, items: [{ product: "briar-sd110l", pick: 6, qty: 1, preorder: true }, { product: "diamond-sd140", pick: 10, qty: 1 }],
    method: "VA", channel: "BNI", service: "jnt_ez",
  },
  {
    status: "SHIPPED", name: "Ayu Lestari", wa: "+6281388990011",
    address: { province: "Jawa Barat", city: "Kota Bogor", district: "Bogor Tengah", postalCode: "16124", line: "Jl. Pajajaran No. 88" },
    agoHours: 120, items: [{ product: "bliss-stretch-canvas-sd16-kids", pick: 2, qty: 2 }], method: "EWALLET", channel: "OVO",
    service: "jne_reg", awb: "JNE0412873365",
  },
  {
    status: "SHIPPED", name: "Clarissa Tanoto", wa: "+6281211002299", locale: "en",
    address: { province: "DKI Jakarta", city: "Kota Jakarta Utara", district: "Kelapa Gading", postalCode: "14240", line: "Jl. Boulevard Raya Blok QJ No. 12" },
    agoHours: 98, items: [{ product: "kiki-sl240", pick: 0, qty: 1 }, { product: "be-you-alicia-pull-on-skirt-by75", pick: 0, qty: 1 }],
    method: "EWALLET", channel: "SHOPEEPAY", service: "sicepat_reg", awb: "004512778932",
  },
  {
    status: "DELIVERED", name: "Putri Maharani", wa: "+6285233445566",
    address: { province: "Jawa Timur", city: "Kota Malang", district: "Lowokwaru", postalCode: "65145", line: "Jl. Soekarno Hatta No. 9, Perum Griya Shanta" },
    agoHours: 220, items: [{ product: "alina-i-pointe-shoe-p88", pick: 3, qty: 1 }], method: "VA", channel: "BRI", service: "jne_yes", awb: "JNE0418820147",
  },
  {
    status: "DELIVERED", name: "Galih Saputra", wa: "+6289612345678",
    address: { province: "Jawa Tengah", city: "Kota Surakarta", district: "Laweyan", postalCode: "57148", line: "Jl. Dr. Radjiman No. 210" },
    agoHours: 190, items: [{ product: "theo-ta75", pick: 1, qty: 1 }], method: "VA", channel: "PERMATA", service: "jnt_ez", awb: "JX2290017734",
  },
  {
    status: "EXPIRED", name: "Intan Permatasari", wa: "+6281299887766",
    address: { province: "Jawa Barat", city: "Kota Bekasi", district: "Bekasi Selatan", postalCode: "17141", line: "Jl. Ahmad Yani No. 3, Ruko Sentra Niaga" },
    agoHours: 150, items: [{ product: "elise-sl247", pick: 1, qty: 1 }], method: "QRIS", service: "jne_reg",
  },
];

function digits(n: number): string {
  let s = "";
  for (let i = 0; i < n; i++) s += randomInt(0, 10);
  return s;
}

export async function seedOrders(db: DB, now: Date = new Date()): Promise<number> {
  const allVariants = await db.select().from(variants);
  const prods = await db.query.products.findMany();
  const prodMap = new Map(prods.map((p) => [p.id, p]));
  const shipping = new MockShippingProvider();
  const usedNos = new Set<string>();
  let count = 0;

  for (const spec of SPECS) {
    const created = new Date(now.getTime() - spec.agoHours * H);
    const locale: Locale = spec.locale ?? "id";
    const zone = resolveZone(spec.address.province, spec.address.city);
    if (!zone) throw new Error(`Seed address not in Java areas: ${spec.address.city}`);
    const address: Address = { ...spec.address, province: spec.address.province as JavaProvince, zone };

    // pick variants deterministically: k-th variant with enough available stock (or PREORDER)
    const lines = spec.items.map((it) => {
      const pool = allVariants
        .filter((v) => v.productId === it.product)
        .filter((v) => (it.preorder ? v.onHand - v.reserved === 0 && v.preorderEnabled : v.onHand - v.reserved >= it.qty))
        .sort((a, b) => a.sortOrder - b.sortOrder);
      const v = pool[it.pick % Math.max(pool.length, 1)];
      if (!v) throw new Error(`No seedable variant for ${it.product}`);
      const p = prodMap.get(it.product)!;
      return { v, p, qty: it.qty, isPreorder: !!it.preorder };
    });

    const subtotal = lines.reduce((s, l) => s + l.p.priceIdr * l.qty, 0);
    const weight = lines.reduce((s, l) => s + l.v.weightGrams * l.qty, 0);
    // quote at 10:00 WIB of the creation day so instant services are available when wanted
    const quoteAt = new Date(Date.UTC(created.getUTCFullYear(), created.getUTCMonth(), created.getUTCDate(), 3, 0));
    const rates = await shipping.getRates({ destination: { ...address, postalCode: address.postalCode }, weightGrams: weight, itemValueIdr: subtotal, now: quoteAt });
    const rate = rates.find((r) => r.serviceCode === spec.service) ?? rates.find((r) => r.type !== "instant") ?? rates[0];
    const discount = spec.voucher && subtotal >= 500_000 ? computeDiscount("percent", 10, subtotal) : 0;
    const insurance = rate.insuranceIdr;
    const total = subtotal - discount + rate.priceIdr + insurance;

    let orderNo = generateOrderNo(created);
    while (usedNos.has(orderNo)) orderNo = generateOrderNo(created);
    usedNos.add(orderNo);

    const payExpires = new Date(created.getTime() + PAYMENT_EXPIRY_MINUTES[spec.method] * 60_000);
    const paidAt = ["PAID", "PROCESSING", "SHIPPED", "DELIVERED"].includes(spec.status) ? new Date(created.getTime() + 12 * 60_000) : null;
    const processingAt = ["PROCESSING", "SHIPPED", "DELIVERED"].includes(spec.status) ? new Date(paidAt!.getTime() + 3 * H) : null;
    const shippedAt = ["SHIPPED", "DELIVERED"].includes(spec.status) ? new Date(processingAt!.getTime() + 18 * H) : null;
    const deliveredAt = spec.status === "DELIVERED" ? new Date(shippedAt!.getTime() + 48 * H) : null;
    const expiredAt = spec.status === "EXPIRED" ? new Date(payExpires.getTime() + RESERVATION_GRACE_MINUTES * 60_000) : null;
    const updatedAt = deliveredAt ?? shippedAt ?? processingAt ?? paidAt ?? expiredAt ?? created;
    const tracking = shippedAt
      ? { courier: rate.courier, awb: spec.awb ?? `RDS${digits(10)}`, shippedAt: shippedAt.toISOString(), deliveredAt: deliveredAt?.toISOString() ?? null }
      : null;

    const [o] = await db
      .insert(orders)
      .values({
        orderNo, status: spec.status, locale, customerName: spec.name, customerWa: spec.wa, customerEmail: spec.email ?? null,
        waOptIn: spec.optIn ?? true, address,
        shipping: { serviceCode: rate.serviceCode, courier: rate.courier, service: rate.service, type: rate.type, priceIdr: rate.priceIdr, eta: rate.eta, etaUnit: rate.etaUnit, insured: true },
        subtotalIdr: subtotal, shippingIdr: rate.priceIdr, insuranceIdr: insurance, discountIdr: discount, totalIdr: total,
        voucherCode: discount ? "RELEVE10" : null, hasPreorder: lines.some((l) => l.isPreorder), tracking,
        paidAt, processingAt, shippedAt, deliveredAt, expiresAt: payExpires, createdAt: created, updatedAt,
      })
      .returning();

    await db.insert(orderItems).values(
      lines.map((l) => ({
        orderId: o.id, sku: l.v.sku, productId: l.p.id, nameSnapshot: l.p.name, variantLabel: variantLabel(l.v),
        priceIdr: l.p.priceIdr, qty: l.qty, isPreorder: l.isPreorder,
      })),
    );

    const stocked = lines.filter((l) => !l.isPreorder);
    if (stocked.length) {
      await db.insert(stockReservations).values(
        stocked.map((l) => ({
          orderId: o.id, sku: l.v.sku, qty: l.qty,
          expiresAt: new Date(payExpires.getTime() + RESERVATION_GRACE_MINUTES * 60_000),
          consumedAt: paidAt, releasedAt: expiredAt, createdAt: created,
        })),
      );
    }
    if (spec.status === "PENDING_PAYMENT") {
      for (const l of stocked) {
        const r = await db
          .update(variants)
          .set({ reserved: sql`${variants.reserved} + ${l.qty}` })
          .where(and(eq(variants.sku, l.v.sku), sql`${variants.onHand} - ${variants.reserved} >= ${l.qty}`))
          .returning({ sku: variants.sku });
        if (!r.length) throw new Error(`Seed reservation failed for ${l.v.sku}`);
        l.v.reserved += l.qty;
      }
    }

    const vaNumber = spec.method === "VA" ? VA_PREFIX[spec.channel as keyof typeof VA_PREFIX] + digits(10) : null;
    const payPage = `/${locale}/pay/${orderNo}`;
    const payStatus = paidAt ? "PAID" : spec.status === "EXPIRED" ? "EXPIRED" : "PENDING";
    const [pay] = await db
      .insert(payments)
      .values({
        orderId: o.id, provider: "mock", method: spec.method, channel: spec.channel ?? null, status: payStatus, amountIdr: total,
        providerRef: `mock_${orderNo}_seed`,
        qrString: spec.method === "QRIS" ? `MOCKQRIS|${orderNo}|${total}` : null,
        vaNumber,
        redirectUrl: spec.method === "EWALLET" ? `${payPage}?step=ewallet` : spec.method === "CARD" ? `${payPage}?step=3ds` : null,
        expiresAt: payExpires, paidAt, raw: { seed: true }, createdAt: created,
      })
      .returning();

    if (spec.optIn ?? true) {
      const ctx = { id: o.id, orderNo, locale, customerName: spec.name, customerWa: spec.wa, waOptIn: true, totalIdr: total };
      const payCtx = { method: spec.method, channel: spec.channel ?? null, expiresAt: payExpires, vaNumber: pay.vaNumber, qrString: pay.qrString };
      const msgs: { template: MessageTemplate; at: Date; extra?: Record<string, string> }[] = [{ template: "ORDER_CREATED", at: created }];
      if (paidAt) msgs.push({ template: "PAYMENT_PAID", at: paidAt });
      if (shippedAt && tracking) msgs.push({ template: "ORDER_SHIPPED", at: shippedAt, extra: { courier: tracking.courier, awb: tracking.awb } });
      if (deliveredAt) msgs.push({ template: "ORDER_DELIVERED", at: deliveredAt });
      if (expiredAt) msgs.push({ template: "PAYMENT_EXPIRED", at: expiredAt });
      await db.insert(waOutbox).values(
        msgs.map((m) => ({
          toWa: spec.wa, template: m.template, locale, orderId: o.id, status: "SENT" as const, createdAt: m.at,
          body: renderNotification(m.template, locale, orderVars(ctx, payCtx, m.extra)),
        })),
      );
    }
    count++;
  }
  return count;
}
