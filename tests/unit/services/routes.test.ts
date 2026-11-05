import "./helpers/env";
import { beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { orders, payments, variants } from "@/db/schema";
import { POST as webhookPOST } from "@/app/api/webhooks/payment/route";
import { POST as simulatePOST } from "@/app/api/demo/simulate-payment/route";
import { GET as cronGET } from "@/app/api/cron/expire/route";
import { buildMockWebhookRequest } from "@/lib/providers/payment/mock";
import { createOrder } from "@/lib/services/order";
import { orderInput, resetWithFixture, setupTestDb } from "./helpers/db";

setupTestDb();
beforeEach(async () => {
  process.env.DEMO_MODE = "true";
  await resetWithFixture();
});

const json = (body: unknown) => new Request("http://shop.test/api/demo/simulate-payment", { method: "POST", body: JSON.stringify(body) });

describe("API routes", () => {
  it("POST /api/webhooks/payment: 200 for valid, 401 for bad signature, 404 unknown ref", async () => {
    const r = await createOrder(orderInput());
    if (!r.ok) throw new Error();
    const [o] = await db.select().from(orders).where(eq(orders.orderNo, r.orderNo));
    const [p] = await db.select().from(payments).where(eq(payments.orderId, o.id));
    const ok = await webhookPOST(buildMockWebhookRequest({ provider_ref: p.providerRef, status: "PAID" }));
    expect(ok.status).toBe(200);
    expect(await ok.json()).toMatchObject({ ok: true, orderStatus: "PAID" });
    const bad = await webhookPOST(new Request("http://x", { method: "POST", body: "{}", headers: { "x-mock-signature": "00" } }));
    expect(bad.status).toBe(401);
    const unknown = await webhookPOST(buildMockWebhookRequest({ provider_ref: "nope", status: "PAID" }));
    expect(unknown.status).toBe(404);
  });

  it("POST /api/demo/simulate-payment works only in DEMO_MODE", async () => {
    const r = await createOrder(orderInput());
    if (!r.ok) throw new Error();
    expect((await simulatePOST(json({ orderNo: r.orderNo, outcome: "MAYBE" }))).status).toBe(400);
    expect((await simulatePOST(new Request("http://x", { method: "POST", body: "nope" }))).status).toBe(400);
    expect((await simulatePOST(json({ orderNo: "RDS-000000-0000", outcome: "PAID" }))).status).toBe(404);
    const res = await simulatePOST(json({ orderNo: r.orderNo, outcome: "PAID" }));
    expect(res.status).toBe(200);
    expect((await db.select().from(variants).where(eq(variants.sku, "T-READY")))[0].onHand).toBe(9);
    expect((await simulatePOST(json({ orderNo: r.orderNo, outcome: "PAID" }))).status).toBe(409);
    process.env.DEMO_MODE = "false";
    expect((await simulatePOST(json({ orderNo: r.orderNo, outcome: "PAID" }))).status).toBe(404);
  });

  it("GET /api/cron/expire requires the bearer secret outside demo mode", async () => {
    process.env.DEMO_MODE = "false";
    expect((await cronGET(new Request("http://x/api/cron/expire"))).status).toBe(401);
    const ok = await cronGET(new Request("http://x/api/cron/expire", { headers: { authorization: "Bearer test-cron" } }));
    expect(ok.status).toBe(200);
    expect(await ok.json()).toEqual({ ok: true, expired: [] });
    process.env.DEMO_MODE = "true";
    expect((await cronGET(new Request("http://x/api/cron/expire"))).status).toBe(200);
  });
});
