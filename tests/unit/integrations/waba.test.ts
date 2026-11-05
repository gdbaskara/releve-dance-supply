import { describe, expect, it } from "vitest";
import type { MessageTemplate } from "@/lib/contracts";
import { WabaMessagingProvider, buildWabaTemplateBody } from "@/lib/providers/messaging/waba";
import { WABA_TEMPLATES, sanitizeParam } from "@/lib/providers/messaging/waba-templates";
import { NOTIFICATION_TEMPLATES } from "@/lib/wa/templates";
import { ProviderHttpError } from "@/lib/providers/http";
import type { WabaConfig } from "@/lib/providers/config";
import { mockFetch } from "./helpers";

const config: WabaConfig = {
  token: "EAAG-test-token",
  phoneNumberId: "109876543210",
  apiVersion: "v26.0",
  baseUrl: "https://graph.facebook.test",
  templatePrefix: "releve_",
  languages: { id: "id", en: "en" },
};

/** Minimal stand-in for drizzle's db.insert(table).values(row). */
function fakeDb() {
  const rows: Record<string, unknown>[] = [];
  const db = { insert: () => ({ values: async (row: Record<string, unknown>) => void rows.push(row) }) };
  return { db: db as never, rows };
}

const vars = {
  name: "Siti",
  order_no: "RDS-261105-AB12",
  total: "Rp685.000",
  method: "QRIS",
  expires: "5 Nov 2026 10.30 WIB",
  pay_url: "https://releve.test/id/pay/RDS-261105-AB12",
};

describe("WABA template mapping (WA-06)", () => {
  it("every placeholder of the id/en text is a template parameter (and nothing else)", () => {
    for (const [t, { params }] of Object.entries(WABA_TEMPLATES) as [MessageTemplate, { params: string[] }][]) {
      for (const locale of ["id", "en"] as const) {
        const placeholders = [...NOTIFICATION_TEMPLATES[t][locale].matchAll(/\{(\w+)\}/g)].map((m) => m[1]);
        // same set; a language may use them in another order ({{2}} before {{1}} is fine in Meta templates)
        expect([...placeholders].sort(), `${t}/${locale}`).toEqual([...params].sort());
      }
    }
  });

  it("sanitises params (no newlines/tabs/long spaces, never empty)", () => {
    expect(sanitizeParam("a\nb\t c     d")).toBe("a b c d");
    expect(sanitizeParam("")).toBe("-");
    expect(sanitizeParam(undefined)).toBe("-");
  });

  it("builds a template message with positional body parameters and the locale's language", () => {
    const body = buildWabaTemplateBody("+62 812-3456-7890", "ORDER_CREATED", "en", vars, config);
    expect(body).toEqual({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: "6281234567890",
      type: "template",
      template: {
        name: "releve_order_created",
        language: { code: "en" },
        components: [{ type: "body", parameters: ["Siti", "RDS-261105-AB12", "Rp685.000", "QRIS", "5 Nov 2026 10.30 WIB", vars.pay_url].map((text) => ({ type: "text", text })) }],
      },
    });
  });
});

describe("WabaMessagingProvider.send", () => {
  it("POSTs to the Cloud API with Bearer token and records SENT in wa_outbox", async () => {
    const m = mockFetch(() => ({ body: { messaging_product: "whatsapp", contacts: [{ wa_id: "6281234567890" }], messages: [{ id: "wamid.HBg" }] } }));
    const { db, rows } = fakeDb();
    const p = new WabaMessagingProvider({ config, fetchImpl: m.fetchImpl, db });
    await p.send("+6281234567890", "ORDER_CREATED", "id", vars, "order-uuid");
    expect(m.calls).toHaveLength(1);
    expect(m.calls[0].url).toBe("https://graph.facebook.test/v26.0/109876543210/messages");
    expect(m.calls[0].method).toBe("POST");
    expect(m.calls[0].headers.authorization).toBe("Bearer EAAG-test-token");
    expect(m.calls[0].body).toMatchObject({ to: "6281234567890", template: { name: "releve_order_created", language: { code: "id" } } });
    expect(rows).toEqual([
      {
        toWa: "+6281234567890",
        template: "ORDER_CREATED",
        locale: "id",
        body: expect.stringContaining("Pesanan RDS-261105-AB12 sebesar Rp685.000"),
        orderId: "order-uuid",
        status: "SENT",
      },
    ]);
  });

  it("Meta error → records FAILED and rethrows ProviderHttpError with Meta's code & details", async () => {
    const m = mockFetch(() => ({
      status: 400,
      body: { error: { message: "(#132001) Template name does not exist in the translation", type: "OAuthException", code: 132001, error_data: { details: "template name (releve_order_shipped) does not exist in en" } } },
    }));
    const { db, rows } = fakeDb();
    const p = new WabaMessagingProvider({ config, fetchImpl: m.fetchImpl, db });
    const err = await p.send("+6281234567890", "ORDER_SHIPPED", "en", { order_no: "X", courier: "JNE", awb: "1", track_url: "u" }).catch((e) => e);
    expect(err).toBeInstanceOf(ProviderHttpError);
    expect(err).toMatchObject({ status: 400, code: "132001" });
    expect(err.message).toContain("does not exist in en");
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ status: "FAILED", template: "ORDER_SHIPPED", orderId: null });
  });

  it("network error / response without message id → FAILED", async () => {
    const { db, rows } = fakeDb();
    const failing = async () => {
      throw new TypeError("fetch failed");
    };
    await expect(new WabaMessagingProvider({ config, fetchImpl: failing, db }).send("+62811", "ORDER_DELIVERED", "id", { order_no: "X" })).rejects.toThrow(/NETWORK_ERROR/);
    const m = mockFetch(() => ({ body: { messages: [] } }));
    await expect(new WabaMessagingProvider({ config, fetchImpl: m.fetchImpl, db }).send("+62811", "ORDER_DELIVERED", "id", { order_no: "X" })).rejects.toThrow(/message id/);
    expect(rows.map((r) => r.status)).toEqual(["FAILED", "FAILED"]);
  });

  it("missing env → 'not configured' before any request or outbox row", async () => {
    const { db, rows } = fakeDb();
    const m = mockFetch(() => ({ body: {} }));
    const saved = process.env.WABA_TOKEN;
    delete process.env.WABA_TOKEN;
    try {
      await expect(new WabaMessagingProvider({ fetchImpl: m.fetchImpl, db }).send("+62811", "ORDER_DELIVERED", "id", {})).rejects.toThrow(
        /not configured: missing WABA_TOKEN/,
      );
    } finally {
      if (saved) process.env.WABA_TOKEN = saved;
    }
    expect(m.calls).toHaveLength(0);
    expect(rows).toHaveLength(0);
  });
});
