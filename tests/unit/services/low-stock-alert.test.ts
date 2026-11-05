import "./helpers/env";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { waOutbox } from "@/db/schema";
import { createOrder } from "@/lib/services/order";
import { adjustStock } from "@/lib/services/stock";
import { orderInput, resetWithFixture, setupTestDb } from "./helpers/db";

setupTestDb();
beforeEach(resetWithFixture);
afterEach(() => {
  delete process.env.ADMIN_WA_NUMBER;
});

const alerts = () => db.select().from(waOutbox).where(eq(waOutbox.template, "LOW_STOCK_ALERT"));

describe("low-stock WhatsApp alert to the admin", () => {
  it("admin stock edit crossing into the low band sends one alert to the store number by default", async () => {
    await adjustStock("L-M", 3, "admin@releve.test");
    const rows = await alerts();
    expect(rows).toHaveLength(1);
    expect(rows[0].toWa).toBe("+6281200000000");
    expect(rows[0].orderId).toBeNull();
    expect(rows[0].body).toContain("Test Leotard");
    expect(rows[0].body).toContain("TL02");
    expect(rows[0].body).toContain("3");
    expect(rows[0].body).toContain("http://shop.test/admin/products/test-leo");
  });

  it("sends to ADMIN_WA_NUMBER when it is set", async () => {
    process.env.ADMIN_WA_NUMBER = "6281999999999";
    await adjustStock("L-M", 2, "admin@releve.test");
    expect((await alerts()).map((r) => r.toWa)).toEqual(["+6281999999999"]);
  });

  it("skips the alert (without failing the stock edit) when no valid admin number is configured", async () => {
    process.env.ADMIN_WA_NUMBER = "not-a-number";
    const saved = process.env.NEXT_PUBLIC_WA_NUMBER;
    process.env.NEXT_PUBLIC_WA_NUMBER = "";
    try {
      expect(await adjustStock("L-M", 3, "admin@releve.test")).toMatchObject({ ok: true });
      expect(await alerts()).toEqual([]);
    } finally {
      process.env.NEXT_PUBLIC_WA_NUMBER = saved;
    }
  });

  it("does not alert when the band is not crossed", async () => {
    await adjustStock("L-M", 4, "admin@releve.test"); // 5 -> 4
    await adjustStock("T-LOW", 1, "admin@releve.test"); // already low: 2 -> 1
    await adjustStock("T-READY", 20, "admin@releve.test"); // restock
    expect(await alerts()).toEqual([]);
  });

  it("an order reserving stock down into the low band alerts the admin", async () => {
    const r = await createOrder(orderInput({ items: [{ sku: "L-M", qty: 2 }] })); // 5 -> 3
    expect(r.ok).toBe(true);
    const rows = await alerts();
    expect(rows).toHaveLength(1);
    expect(rows[0].body).toContain("Test Leotard");
  });

  it("an order taking the last unit sends an out-of-stock alert", async () => {
    const r = await createOrder(orderInput({ items: [{ sku: "T-LAST", qty: 1 }] })); // 1 -> 0
    expect(r.ok).toBe(true);
    const rows = await alerts();
    expect(rows).toHaveLength(1);
    expect(rows[0].body).toContain("Test Slipper");
  });

  it("ordinary sales above the band stay quiet", async () => {
    await createOrder(orderInput({ items: [{ sku: "T-READY", qty: 1 }] })); // 10 -> 9
    expect(await alerts()).toEqual([]);
  });
});
