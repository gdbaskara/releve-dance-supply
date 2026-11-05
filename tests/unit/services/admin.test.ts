import "./helpers/env";
import { beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { backInStockRequests, stockMovements, variants, waOutbox } from "@/db/schema";
import { createOrder } from "@/lib/services/order";
import { simulatePayment } from "@/lib/services/payment";
import { getDashboardStats, getOrderAdmin, listOrders, transitionOrder, adminTransitionsFor } from "@/lib/services/order-admin";
import {
  adjustStock, getProductAdmin, listBackInStock, listLowStock, listProductsAdmin, listStockMovements, requestBackInStock, setPreorder,
} from "@/lib/services/stock";
import { listOutbox } from "@/lib/services/outbox";
import { seedAdminAndVoucher } from "@/db/seed";
import { signAdminToken, verifyAdminToken, verifyCredentials } from "@/lib/auth/session";
import { orderInput, resetWithFixture, setupTestDb } from "./helpers/db";

setupTestDb();
beforeEach(resetWithFixture);

const variant = async (sku: string) => (await db.select().from(variants).where(eq(variants.sku, sku)))[0];

async function paidOrder(items = [{ sku: "T-READY", qty: 1 }]) {
  const r = await createOrder(orderInput({ items }));
  if (!r.ok) throw new Error("order failed");
  await simulatePayment(r.orderNo, "PAID");
  return r.orderNo;
}

describe("transitionOrder (ADM-04, SHP-03, docs/05 §3)", () => {
  it("PAID → PROCESSING → SHIPPED (needs courier+awb) → DELIVERED with WA messages", async () => {
    const no = await paidOrder();
    expect(await transitionOrder(no, "SHIPPED", { courier: "JNE", awb: "X1" })).toEqual({ ok: false, error: "INVALID_TRANSITION" });
    expect(await transitionOrder(no, "PROCESSING")).toEqual({ ok: true, orderNo: no, status: "PROCESSING" });
    expect(await transitionOrder(no, "SHIPPED", { courier: "JNE" })).toEqual({ ok: false, error: "TRACKING_REQUIRED" });
    expect(await transitionOrder(no, "SHIPPED", { courier: "JNE", awb: "JNE123" })).toMatchObject({ ok: true });
    expect(await transitionOrder(no, "DELIVERED")).toMatchObject({ ok: true });
    expect(await transitionOrder(no, "CANCELLED")).toEqual({ ok: false, error: "INVALID_TRANSITION" });
    const view = await getOrderAdmin(no);
    expect(view!.status).toBe("DELIVERED");
    expect(view!.tracking).toMatchObject({ courier: "JNE", awb: "JNE123" });
    expect(view!.timeline.every((t) => t.done)).toBe(true);
    expect(view!.messages.map((m) => m.template)).toEqual(["ORDER_CREATED", "PAYMENT_PAID", "ORDER_SHIPPED", "ORDER_DELIVERED"]);
    expect(view!.messages[2].body).toContain("resi JNE123");
    expect(view!.allowedTransitions).toEqual([]);
  });

  it("system-only transitions are refused; unknown order → NOT_FOUND", async () => {
    const r = await createOrder(orderInput());
    if (!r.ok) throw new Error();
    expect(await transitionOrder(r.orderNo, "PAID")).toEqual({ ok: false, error: "INVALID_TRANSITION" });
    expect(await transitionOrder(r.orderNo, "EXPIRED")).toEqual({ ok: false, error: "INVALID_TRANSITION" });
    expect(await transitionOrder("RDS-000000-0000", "PROCESSING")).toEqual({ ok: false, error: "NOT_FOUND" });
    expect(adminTransitionsFor("PENDING_PAYMENT")).toEqual(["CANCELLED"]);
  });

  it("cancel from PENDING releases reservations and cancels the payment", async () => {
    const r = await createOrder(orderInput({ items: [{ sku: "T-LAST", qty: 1 }] }));
    if (!r.ok) throw new Error();
    expect((await variant("T-LAST")).reserved).toBe(1);
    expect(await transitionOrder(r.orderNo, "CANCELLED")).toMatchObject({ ok: true });
    expect((await variant("T-LAST")).reserved).toBe(0);
    const v = await getOrderAdmin(r.orderNo);
    expect(v!.payments[0].status).toBe("CANCELLED");
    expect(v!.timeline.map((t) => t.status)).toEqual(["PENDING_PAYMENT", "CANCELLED"]);
  });

  it("refund from PAID returns stock (order_cancel movement) and notifies back-in-stock", async () => {
    const no = await paidOrder([{ sku: "T-LAST", qty: 1 }]);
    expect((await variant("T-LAST")).onHand).toBe(0);
    await requestBackInStock("T-LAST", "081299990000", "en");
    expect(await transitionOrder(no, "REFUND_PENDING")).toMatchObject({ ok: true });
    expect((await variant("T-LAST")).onHand).toBe(1);
    const mv = await db.select().from(stockMovements).where(eq(stockMovements.reason, "order_cancel"));
    expect(mv).toHaveLength(1);
    const bis = await db.select().from(waOutbox).where(eq(waOutbox.template, "BACK_IN_STOCK"));
    expect(bis).toHaveLength(1);
    expect(bis[0].body).toContain("is back in stock");
    expect(await transitionOrder(no, "CANCELLED")).toMatchObject({ ok: true });
    const view = await getOrderAdmin(no);
    expect(view!.timeline.map((t) => t.status)).toEqual(["PENDING_PAYMENT", "PAID", "REFUND_PENDING", "CANCELLED"]);
  });
});

describe("stock admin (STK-07/08, ADM-03)", () => {
  it("adjustStock: rejects below reserved, records movement, notifies back-in-stock once (D3)", async () => {
    expect(await requestBackInStock("T-OUT", "0812-5555-6666", "id")).toEqual({ ok: true, alreadyRequested: false });
    expect(await requestBackInStock("T-OUT", "+6281255556666", "id")).toEqual({ ok: true, alreadyRequested: true });
    expect(await requestBackInStock("T-OUT", "abc", "id")).toEqual({ ok: false, error: "INVALID_WA" });
    expect(await requestBackInStock("NOPE", "081255556666", "id")).toEqual({ ok: false, error: "NOT_FOUND" });

    const res = await adjustStock("T-OUT", 3, "admin@releve.test");
    expect(res).toMatchObject({ ok: true, delta: 3, notified: 1, variant: { available: 3, status: "LOW" } });
    const msg = await db.select().from(waOutbox).where(eq(waOutbox.template, "BACK_IN_STOCK"));
    expect(msg).toHaveLength(1);
    expect(msg[0].body).toBe("Kabar baik! Test Slipper Black · 9.5 · M sudah ready lagi. Pesan sekarang: http://shop.test/id/p/test-shoe");
    const [req] = await db.select().from(backInStockRequests);
    expect(req.notifiedAt).not.toBeNull();
    // a second restock doesn't re-notify
    expect(await adjustStock("T-OUT", 5, "admin")).toMatchObject({ ok: true, notified: 0 });
    const mv = await listStockMovements({ skus: ["T-OUT"] });
    expect(mv.map((m) => m.delta).sort()).toEqual([2, 3]);
    expect(mv[0].actor).toBeTruthy();

    const r = await createOrder(orderInput({ items: [{ sku: "T-LOW", qty: 2 }] }));
    expect(r.ok).toBe(true);
    expect(await adjustStock("T-LOW", 1, "admin")).toEqual({ ok: false, error: "BELOW_RESERVED", reserved: 2 });
    expect(await adjustStock("T-LOW", -1, "admin")).toEqual({ ok: false, error: "INVALID_QTY" });
    expect(await adjustStock("NOPE", 1, "admin")).toEqual({ ok: false, error: "NOT_FOUND" });
  });

  it("setPreorder per variant and per product", async () => {
    expect(await setPreorder({ sku: "T-OUT" }, true, "6-8")).toEqual({ ok: true, updated: 1 });
    expect((await variant("T-OUT")).preorderLeadWeeks).toBe("6-8");
    expect(await setPreorder({ productId: "test-shoe" }, false)).toEqual({ ok: true, updated: 5 });
    expect((await variant("T-PRE")).preorderEnabled).toBe(false);
    expect(await setPreorder({ sku: "T-OUT" }, true, "soon")).toEqual({ ok: false, error: "INVALID_LEAD" });
    expect(await setPreorder({ sku: "NOPE" }, true)).toEqual({ ok: false, error: "NOT_FOUND" });
  });

  it("lists: low stock, back-in-stock, products, product detail", async () => {
    await requestBackInStock("T-OUT", "081255556666", "id");
    const low = await listLowStock();
    expect(low.map((l) => l.sku)).toEqual(["T-LAST", "T-LOW"]);
    const bis = await listBackInStock({ pendingOnly: true });
    expect(bis[0]).toMatchObject({ sku: "T-OUT", productName: "Test Slipper", available: 0, variantLabel: "Black · 9.5 · M" });
    const prods = await listProductsAdmin();
    expect(prods[0]).toMatchObject({ id: "test-shoe", variantCount: 5, onHand: 13, statusCounts: { READY: 1, LOW: 2, PREORDER: 1, SOLD_OUT: 1 } });
    const detail = await getProductAdmin("test-shoe");
    expect(detail!.variants).toHaveLength(5);
    expect(await getProductAdmin("nope")).toBeNull();
  });
});

describe("admin reads", () => {
  it("listOrders filters, outbox list, dashboard stats", async () => {
    const paid = await paidOrder();
    const pending = await createOrder(orderInput({ contact: { name: "Bunga Citra", wa: "081377778888", waOptIn: true } }));
    if (!pending.ok) throw new Error();
    const all = await listOrders();
    expect(all.total).toBe(2);
    expect((await listOrders({ status: "PAID" })).items.map((o) => o.orderNo)).toEqual([paid]);
    expect((await listOrders({ q: "bunga" })).items[0]).toMatchObject({ orderNo: pending.orderNo, itemCount: 1, paymentMethod: "QRIS" });
    const ob = await listOutbox();
    expect(ob.total).toBe(3);
    expect((await listOutbox({ template: "PAYMENT_PAID" })).items[0].orderNo).toBe(paid);
    expect((await listOutbox({ orderNo: pending.orderNo })).total).toBe(1);
    expect((await listOutbox({ to: "0813" })).total).toBe(0);
    const stats = await getDashboardStats();
    expect(stats).toMatchObject({ ordersToday: 2, pendingPayment: 1, toShip: 1, lowStockVariants: 2, soldOutVariants: 1, pendingBackInStock: 0 });
    expect(stats.revenueTodayIdr).toBeGreaterThan(500_000);
    expect(stats.recentOrders).toHaveLength(2);
  });
});

describe("admin auth (ADM-01)", () => {
  it("verifies seeded credentials and round-trips the JWT", async () => {
    await seedAdminAndVoucher().catch(() => undefined); // voucher already exists in fixture → admin inserted first
    expect(await verifyCredentials("ADMIN@releve.test", "secret-pass")).toMatchObject({ email: "admin@releve.test" });
    expect(await verifyCredentials("admin@releve.test", "wrong")).toBeNull();
    expect(await verifyCredentials("nobody@x.test", "secret-pass")).toBeNull();
    const token = await signAdminToken({ sub: "u1", email: "a@b.c", name: "A" });
    expect(await verifyAdminToken(token)).toEqual({ sub: "u1", email: "a@b.c", name: "A" });
    expect(await verifyAdminToken(token + "x")).toBeNull();
    expect(await verifyAdminToken(undefined)).toBeNull();
    const expired = await signAdminToken({ sub: "u1", email: "a@b.c", name: "A" }, new Date(Date.now() - 13 * 3600_000));
    expect(await verifyAdminToken(expired)).toBeNull();
  });
});
