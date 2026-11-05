import "./helpers/env";
import { beforeEach, describe, expect, it } from "vitest";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { orders, payments, products, stockMovements, stockReservations, variants, waOutbox, checkoutLinks } from "@/db/schema";
import { createOrder, changePaymentMethod, getOrderPublic, getOrderForPayPage, getOrderStatus, sendPaymentInstructions } from "@/lib/services/order";
import { handlePaymentWebhook, processPaymentEvent, simulatePayment, simulateCardPayment } from "@/lib/services/payment";
import { expireOrders } from "@/lib/services/expiry";
import { buildMockWebhookRequest } from "@/lib/providers/payment/mock";
import { createCheckoutLink, resolveCheckoutLink, listCheckoutLinks } from "@/lib/services/checkout-link";
import { orderInput, resetWithFixture, setupTestDb } from "./helpers/db";

setupTestDb();
beforeEach(resetWithFixture);

async function variant(sku: string) {
  const [v] = await db.select().from(variants).where(eq(variants.sku, sku));
  return v;
}
async function orderByNo(no: string) {
  const [o] = await db.select().from(orders).where(eq(orders.orderNo, no));
  return o;
}
async function currentPayment(no: string) {
  const o = await orderByNo(no);
  const ps = await db.select().from(payments).where(eq(payments.orderId, o.id));
  return ps.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
}
async function outbox(no?: string) {
  const rows = await db.select({ m: waOutbox, orderNo: orders.orderNo }).from(waOutbox).leftJoin(orders, eq(orders.id, waOutbox.orderId));
  return rows.filter((r) => !no || r.orderNo === no).map((r) => r.m);
}

describe("createOrder (CHK-07, STK-03/05/06)", () => {
  it("happy path: reserves stock, prices server-side, creates payment + ORDER_CREATED", async () => {
    const r = await createOrder(orderInput({ items: [{ sku: "T-READY", qty: 2 }, { sku: "L-M", qty: 1 }] }));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.orderNo).toMatch(/^RDS-\d{6}-[0-9A-Z]{4}$/);
    expect(r.payUrl).toBe(`/id/pay/${r.orderNo}`);
    const o = await orderByNo(r.orderNo);
    expect(o.status).toBe("PENDING_PAYMENT");
    expect(o.customerWa).toBe("+6281234567890");
    expect(o.address.zone).toBe("Z1");
    // 2 × 500k + 800k; weight 750 g + 150 g → 1 kg → JNE REG Z1 10k; insurance 0.25% of 1.8M = 4.500
    expect(o.subtotalIdr).toBe(1_800_000);
    expect(o.shippingIdr).toBe(10_000);
    expect(o.insuranceIdr).toBe(4_500);
    expect(o.totalIdr).toBe(1_814_500);
    expect((await variant("T-READY")).reserved).toBe(2);
    expect((await variant("L-M")).reserved).toBe(1);
    const res = await db.select().from(stockReservations).where(eq(stockReservations.orderId, o.id));
    expect(res).toHaveLength(2);
    const p = await currentPayment(r.orderNo);
    expect(p.qrString).toBe(`MOCKQRIS|${r.orderNo}|1814500`);
    expect(res[0].expiresAt.getTime() - p.expiresAt.getTime()).toBe(5 * 60_000);
    const msgs = await outbox(r.orderNo);
    expect(msgs.map((m) => m.template)).toEqual(["ORDER_CREATED"]);
    expect(msgs[0].body).toContain("Rp 1.814.500");
    expect(msgs[0].toWa).toBe("+6281234567890");
  });

  it("applies voucher RELEVE10 and respects insured=false + opt-out", async () => {
    const r = await createOrder(orderInput({ voucherCode: "releve10", insured: false, contact: { name: "X Y", wa: "081234567890", waOptIn: false } }));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const o = await orderByNo(r.orderNo);
    expect(o.discountIdr).toBe(50_000);
    expect(o.insuranceIdr).toBe(0);
    expect(o.totalIdr).toBe(500_000 - 50_000 + 10_000);
    expect(await outbox(r.orderNo)).toHaveLength(0);
  });

  it("rejects invalid voucher, shipping, non-Java, bad phone, unknown sku", async () => {
    expect(await createOrder(orderInput({ voucherCode: "NOPE" }))).toMatchObject({ ok: false, error: "INVALID_VOUCHER" });
    await db.update(products).set({ priceIdr: 400_000 }).where(eq(products.id, "test-shoe"));
    expect(await createOrder(orderInput({ voucherCode: "RELEVE10" })))
      .toMatchObject({ ok: false, error: "INVALID_VOUCHER", message: "MIN_SUBTOTAL" });
    expect(await createOrder(orderInput({ shippingServiceCode: "nope" }))).toMatchObject({ ok: false, error: "INVALID_SHIPPING" });
    expect(
      await createOrder(orderInput({ address: { province: "Jawa Barat", city: "Kota Bandung", district: "x", postalCode: "40132", line: "Jl. A no 1" }, shippingServiceCode: "gosend_instant" })),
    ).toMatchObject({ ok: false, error: "INVALID_SHIPPING" });
    expect(await createOrder(orderInput({ address: { province: "Bali" as never, city: "Kota Denpasar", district: "x", postalCode: "80111", line: "Jl. A no 1" } })))
      .toEqual({ ok: false, error: "OUTSIDE_JAVA" });
    expect(await createOrder(orderInput({ contact: { name: "X Y", wa: "12345", waOptIn: true } }))).toMatchObject({ ok: false, error: "INVALID_INPUT" });
    expect(await createOrder(orderInput({ items: [{ sku: "NOPE", qty: 1 }] }))).toMatchObject({ ok: false, error: "INVALID_INPUT" });
    expect(await createOrder({ ...orderInput(), method: "COD" })).toMatchObject({ ok: false, error: "INVALID_INPUT" });
    expect(await db.select().from(orders)).toHaveLength(0);
  });

  it("OUT_OF_STOCK lists every short SKU and creates nothing", async () => {
    const r = await createOrder(orderInput({ items: [{ sku: "T-READY", qty: 1 }, { sku: "T-LOW", qty: 3 }, { sku: "T-OUT", qty: 1 }] }));
    expect(r).toEqual({ ok: false, error: "OUT_OF_STOCK", skus: ["T-LOW", "T-OUT"] });
    expect(await db.select().from(orders)).toHaveLength(0);
    expect((await variant("T-READY")).reserved).toBe(0); // rolled back
  });

  it("pre-order items are flagged without reservation (STK-06)", async () => {
    const r = await createOrder(orderInput({ items: [{ sku: "T-PRE", qty: 2 }, { sku: "T-READY", qty: 1 }] }));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const view = await getOrderForPayPage(r.orderNo);
    expect(view!.hasPreorder).toBe(true);
    expect(view!.items.find((i) => i.isPreorder)?.qty).toBe(2);
    expect((await variant("T-PRE")).reserved).toBe(0);
    expect(await createOrder(orderInput({ items: [{ sku: "T-PRE", qty: 6 }] }))).toMatchObject({ error: "OUT_OF_STOCK" });
  });

  it("STK-05 / D9: two parallel checkouts for the last unit → exactly one succeeds", async () => {
    const results = await Promise.all([
      createOrder(orderInput({ items: [{ sku: "T-LAST", qty: 1 }] })),
      createOrder(orderInput({ items: [{ sku: "T-LAST", qty: 1 }] })),
    ]);
    expect(results.filter((r) => r.ok)).toHaveLength(1);
    expect(results.filter((r) => !r.ok)).toEqual([{ ok: false, error: "OUT_OF_STOCK", skus: ["T-LAST"] }]);
    const v = await variant("T-LAST");
    expect(v.reserved).toBe(1);
    expect(v.onHand).toBe(1);
  });

  it("STK-05 under load: 8 parallel buyers for 2 units of LOW stock", async () => {
    const results = await Promise.all(Array.from({ length: 8 }, () => createOrder(orderInput({ items: [{ sku: "T-LOW", qty: 1 }] }))));
    expect(results.filter((r) => r.ok)).toHaveLength(2);
    expect((await variant("T-LOW")).reserved).toBe(2);
  });
});

describe("payment webhook (PAY-07/08)", () => {
  it("PAID consumes stock exactly once even if the webhook is delivered twice", async () => {
    const r = await createOrder(orderInput({ items: [{ sku: "T-READY", qty: 3 }] }));
    if (!r.ok) throw new Error("order failed");
    const p = await currentPayment(r.orderNo);
    const body = { event_id: "evt_dup_1", provider_ref: p.providerRef, status: "PAID" as const };
    const first = await handlePaymentWebhook(buildMockWebhookRequest(body));
    const second = await handlePaymentWebhook(buildMockWebhookRequest(body));
    expect(first).toMatchObject({ ok: true, duplicate: false, orderStatus: "PAID" });
    expect(second).toMatchObject({ ok: true, duplicate: true });
    // a *different* event for the same already-paid payment is also a no-op
    expect(await handlePaymentWebhook(buildMockWebhookRequest({ ...body, event_id: "evt_dup_2" }))).toMatchObject({ ignored: "ALREADY_PROCESSED" });
    const v = await variant("T-READY");
    expect(v.onHand).toBe(7);
    expect(v.reserved).toBe(0);
    const o = await orderByNo(r.orderNo);
    expect(o.status).toBe("PAID");
    expect(o.paidAt).not.toBeNull();
    const mv = await db.select().from(stockMovements).where(and(eq(stockMovements.sku, "T-READY"), eq(stockMovements.reason, "order_paid")));
    expect(mv).toEqual([expect.objectContaining({ delta: -3, ref: r.orderNo })]);
    expect((await outbox(r.orderNo)).map((m) => m.template)).toEqual(["ORDER_CREATED", "PAYMENT_PAID"]);
  });

  it("rejects bad signatures and unknown payments (event not recorded)", async () => {
    const req = buildMockWebhookRequest({ provider_ref: "x", status: "PAID" });
    const tampered = new Request(req.url, { method: "POST", headers: req.headers, body: (await req.text()).replace("PAID", "EXPIRED") });
    expect(await handlePaymentWebhook(tampered)).toEqual({ ok: false, error: "INVALID_SIGNATURE" });
    expect(await processPaymentEvent("mock", { eventId: "e1", providerRef: "nope", status: "PAID", raw: {} })).toEqual({ ok: false, error: "UNKNOWN_PAYMENT" });
  });

  it("simulate EXPIRED releases reservations immediately (D6)", async () => {
    const r = await createOrder(orderInput({ items: [{ sku: "T-LAST", qty: 1 }] }));
    if (!r.ok) throw new Error();
    expect((await variant("T-LAST")).reserved).toBe(1);
    expect(await simulatePayment(r.orderNo, "EXPIRED")).toMatchObject({ ok: true, orderStatus: "EXPIRED" });
    expect((await variant("T-LAST")).reserved).toBe(0);
    expect((await outbox(r.orderNo)).map((m) => m.template)).toContain("PAYMENT_EXPIRED");
    expect(await simulatePayment(r.orderNo, "PAID")).toEqual({ ok: false, error: "NO_PENDING_PAYMENT" });
    expect(await simulatePayment("RDS-000000-0000", "PAID")).toEqual({ ok: false, error: "NOT_FOUND" });
  });

  it("card: 4000 0000 0000 0002 fails, retry with a new method then pay (PAY-05/10)", async () => {
    const r = await createOrder(orderInput({ method: "CARD" }));
    if (!r.ok) throw new Error();
    expect(await simulateCardPayment(r.orderNo, "4000 0000 0000 0002")).toMatchObject({ ok: true, orderStatus: "PENDING_PAYMENT" });
    expect((await currentPayment(r.orderNo)).status).toBe("FAILED");
    const changed = await changePaymentMethod(r.orderNo, "VA", "BRI");
    expect(changed.ok && changed.payment.vaNumber).toMatch(/^26215\d{10}$/);
    expect((await variant("T-READY")).reserved).toBe(1); // reservation kept
    expect(await simulateCardPayment(r.orderNo, "4111 1111 1111 1111")).toMatchObject({ orderStatus: "PAID" });
  });

  it("an EXPIRED event for a replaced payment does not expire the order", async () => {
    const r = await createOrder(orderInput());
    if (!r.ok) throw new Error();
    const old = await currentPayment(r.orderNo);
    await changePaymentMethod(r.orderNo, "EWALLET", "DANA");
    const res = await processPaymentEvent("mock", { eventId: "e-old", providerRef: old.providerRef, status: "EXPIRED", raw: {} });
    expect(res).toMatchObject({ ignored: "ALREADY_PROCESSED" });
    expect((await orderByNo(r.orderNo)).status).toBe("PENDING_PAYMENT");
  });
});

describe("expiry (STK-03)", () => {
  it("expireOrders releases reservations after payment expiry + 5 min grace", async () => {
    const r = await createOrder(orderInput({ items: [{ sku: "T-LOW", qty: 2 }] }));
    if (!r.ok) throw new Error();
    const p = await currentPayment(r.orderNo);
    expect((await expireOrders(new Date(p.expiresAt.getTime() + 4 * 60_000))).expired).toEqual([]);
    expect((await expireOrders(new Date(p.expiresAt.getTime() + 6 * 60_000))).expired).toEqual([r.orderNo]);
    const v = await variant("T-LOW");
    expect(v.reserved).toBe(0);
    expect(v.onHand).toBe(2);
    expect((await orderByNo(r.orderNo)).status).toBe("EXPIRED");
    expect((await currentPayment(r.orderNo)).status).toBe("EXPIRED");
    const [res] = await db.select().from(stockReservations);
    expect(res.releasedAt).not.toBeNull();
    // idempotent
    expect((await expireOrders(new Date(p.expiresAt.getTime() + 60 * 60_000))).expired).toEqual([]);
    expect((await outbox(r.orderNo)).filter((m) => m.template === "PAYMENT_EXPIRED")).toHaveLength(1);
  });

  it("a late PAID webhook on an expired order does not touch stock", async () => {
    const r = await createOrder(orderInput());
    if (!r.ok) throw new Error();
    const p = await currentPayment(r.orderNo);
    await expireOrders(new Date(p.expiresAt.getTime() + 10 * 60_000));
    const res = await processPaymentEvent("mock", { eventId: "late", providerRef: p.providerRef, status: "PAID", raw: {} });
    expect(res).toMatchObject({ ignored: "ORDER_NOT_PENDING" });
    expect((await variant("T-READY")).onHand).toBe(10);
  });
});

describe("reads & buyer actions (ORD-03, PAY-09/10)", () => {
  it("getOrderPublic requires the WA last 4 digits; mismatch → null", async () => {
    const r = await createOrder(orderInput());
    if (!r.ok) throw new Error();
    expect(await getOrderPublic(r.orderNo, "0000")).toBeNull();
    expect(await getOrderPublic("RDS-000000-0000", "7890")).toBeNull();
    const v = await getOrderPublic(r.orderNo.toLowerCase(), "7890");
    expect(v).toMatchObject({ orderNo: r.orderNo, status: "PENDING_PAYMENT", customerWaMasked: "+62 812-•••-7890" });
    expect(v!.timeline.map((t) => [t.status, t.done])).toEqual([
      ["PENDING_PAYMENT", true], ["PAID", false], ["PROCESSING", false], ["SHIPPED", false], ["DELIVERED", false],
    ]);
    expect(v!.payment?.method).toBe("QRIS");
    const s = await getOrderStatus(r.orderNo);
    expect(s).toMatchObject({ status: "PENDING_PAYMENT", payment: { status: "PENDING" } });
    expect(await getOrderStatus("RDS-000000-0000")).toBeNull();
  });

  it("changePaymentMethod cancels old payment, keeps reservation, extends expiry", async () => {
    const r = await createOrder(orderInput({ items: [{ sku: "T-LAST", qty: 1 }] }));
    if (!r.ok) throw new Error();
    const old = await currentPayment(r.orderNo);
    const res = await changePaymentMethod(r.orderNo, "VA", "BCA");
    expect(res.ok).toBe(true);
    const pays = await db.select().from(payments);
    expect(pays.find((p) => p.id === old.id)?.status).toBe("CANCELLED");
    expect(pays.filter((p) => p.status === "PENDING")).toHaveLength(1);
    expect((await variant("T-LAST")).reserved).toBe(1);
    const [resv] = await db.select().from(stockReservations);
    expect(resv.expiresAt.getTime()).toBeGreaterThan(Date.now() + 23 * 3600_000);
    expect(await changePaymentMethod(r.orderNo, "VA")).toEqual({ ok: false, error: "INVALID_INPUT" });
    expect(await changePaymentMethod("RDS-000000-0000", "QRIS")).toEqual({ ok: false, error: "NOT_FOUND" });
    await simulatePayment(r.orderNo, "PAID");
    expect(await changePaymentMethod(r.orderNo, "QRIS")).toEqual({ ok: false, error: "NOT_PENDING" });
  });

  it("sendPaymentInstructions queues PAYMENT_INSTRUCTIONS (even without opt-in)", async () => {
    const r = await createOrder(orderInput({ method: "VA", channel: "MANDIRI", contact: { name: "No Opt", wa: "081234567890", waOptIn: false } }));
    if (!r.ok) throw new Error();
    expect(await sendPaymentInstructions(r.orderNo)).toEqual({ ok: true });
    const msgs = await outbox(r.orderNo);
    expect(msgs.map((m) => m.template)).toEqual(["PAYMENT_INSTRUCTIONS"]);
    expect(msgs[0].body).toMatch(/Virtual Account Mandiri nomor VA 88908\d{10}/);
    expect(await sendPaymentInstructions("RDS-000000-0000")).toEqual({ ok: false, error: "NOT_FOUND" });
  });
});

describe("checkout links (ADM-05, CHK-10)", () => {
  it("create → resolve (prefill) → order uses link items → link single-use", async () => {
    const link = await createCheckoutLink({ items: [{ sku: "T-READY", qty: 2 }], customerName: "Sari", customerWa: "0812 1111 2222" }, "admin@releve.test");
    expect(link.ok).toBe(true);
    if (!link.ok) return;
    expect(link.token.length).toBeGreaterThanOrEqual(22);
    expect(link.url).toBe(`http://shop.test/id/checkout?link=${link.token}`);
    expect(link.waLink).toMatch(/^https:\/\/wa\.me\/6281211112222\?text=/);
    expect(link.expiresAt.getTime() - Date.now()).toBeGreaterThan(47 * 3600_000);
    const resolved = await resolveCheckoutLink(link.token);
    expect(resolved).toMatchObject({ ok: true, prefill: { name: "Sari", wa: "+6281211112222" } });
    if (resolved.ok) expect(resolved.cart.lines[0]).toMatchObject({ sku: "T-READY", qty: 2, priceIdr: 500_000 });

    // client items are ignored — the link's items win
    const r = await createOrder(orderInput({ items: [{ sku: "L-M", qty: 1 }], checkoutLinkToken: link.token }));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const o = await orderByNo(r.orderNo);
    expect(o.subtotalIdr).toBe(1_000_000);
    expect(o.checkoutLinkId).not.toBeNull();
    expect(await resolveCheckoutLink(link.token)).toEqual({ ok: false, error: "LINK_EXPIRED" });
    expect(await createOrder(orderInput({ checkoutLinkToken: link.token }))).toEqual({ ok: false, error: "LINK_EXPIRED" });
    const list = await listCheckoutLinks();
    expect(list[0]).toMatchObject({ status: "USED", usedOrderNo: r.orderNo });
  });

  it("expired after 48 h; validation errors", async () => {
    const past = new Date(Date.now() - 49 * 3600_000);
    const link = await createCheckoutLink({ items: [{ sku: "T-READY", qty: 1 }] }, "admin", past);
    if (!link.ok) throw new Error();
    expect(await resolveCheckoutLink(link.token)).toEqual({ ok: false, error: "LINK_EXPIRED" });
    expect(await resolveCheckoutLink("nope-nope-nope")).toEqual({ ok: false, error: "LINK_EXPIRED" });
    expect(await createOrder(orderInput({ checkoutLinkToken: link.token }))).toEqual({ ok: false, error: "LINK_EXPIRED" });
    expect((await listCheckoutLinks())[0].status).toBe("EXPIRED");
    expect(await createCheckoutLink({ items: [{ sku: "NOPE", qty: 1 }] }, "admin")).toEqual({ ok: false, error: "UNKNOWN_SKU", skus: ["NOPE"] });
    expect(await createCheckoutLink({ items: [] }, "admin")).toEqual({ ok: false, error: "INVALID_INPUT" });
    expect(await createCheckoutLink({ items: [{ sku: "T-READY", qty: 1 }], customerWa: "123" }, "admin")).toEqual({ ok: false, error: "INVALID_WA" });
    expect(await db.select().from(checkoutLinks)).toHaveLength(1);
  });
});
