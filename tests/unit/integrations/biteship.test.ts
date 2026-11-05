import { describe, expect, it } from "vitest";
import type { ShippingRateRequest } from "@/lib/contracts";
import { BiteshipShippingProvider, biteshipCourierCode } from "@/lib/providers/shipping/biteship";
import { biteshipConfigFromEnv, type BiteshipConfig } from "@/lib/providers/config";
import { ProviderHttpError } from "@/lib/providers/http";
import { mockFetch, type Call } from "./helpers";

/** WIB = UTC+7 */
const wib = (h: number, m = 0) => new Date(Date.UTC(2026, 10, 5, h - 7, m));

const config: BiteshipConfig = {
  apiKey: "biteship_test.key",
  baseUrl: "https://api.biteship.test",
  couriers: "jne,jnt,sicepat,anteraja,gojek,grab",
  origin: { postalCode: 12160, latitude: -6.2615, longitude: 106.8106 },
  useCourierInsurance: false,
};

const req = (over: Partial<ShippingRateRequest> = {}): ShippingRateRequest => ({
  destination: { province: "DKI Jakarta", city: "Kota Jakarta Barat", zone: "Z1", postalCode: "11470" },
  weightGrams: 300,
  itemValueIdr: 660_000,
  now: wib(10),
  ...over,
});

const pricing = (code: string, svc: string, service_type: string, price: number, range: string, unit: string, extra: Record<string, unknown> = {}) => ({
  courier_name: { jne: "JNE", jnt: "J&T", sicepat: "SiCepat", anteraja: "AnterAja", gojek: "Gojek", grab: "Grab" }[code] ?? code,
  courier_code: code,
  courier_service_name: svc.toUpperCase(),
  courier_service_code: svc,
  service_type,
  shipping_type: "parcel",
  shipment_duration_range: range,
  shipment_duration_unit: unit,
  price,
  ...extra,
});

const PARCEL = [
  pricing("jne", "reg", "standard", 10000, "1 - 2", "days"),
  pricing("jne", "yes", "overnight", 18000, "1", "days"),
  pricing("jnt", "ez", "standard", 9000, "1 - 2", "days"),
  pricing("sicepat", "gokil", "standard", 40000, "2 - 4", "days", { shipping_type: "freight" }),
  pricing("anteraja", "next_day", "standard", 16000, "1", "days"),
];
const INSTANT = [
  pricing("gojek", "instant", "instant", 35000, "1 - 3", "hours"),
  pricing("grab", "same_day", "same_day", 25000, "6 - 8", "hours"),
];

function router(over: Partial<Record<"parcel" | "instant" | "areas" | "tracking", { status?: number; body?: unknown }>> = {}) {
  return (c: Call) => {
    if (c.url.includes("/v1/maps/areas")) return over.areas ?? { body: { success: true, areas: [{ id: "IDNP6IDNC148IDND836", name: "Kebon Jeruk" }] } };
    if (c.url.includes("/v1/trackings/")) return over.tracking ?? { body: {} };
    const b = c.body as Record<string, unknown>;
    if ("origin_latitude" in b) return over.instant ?? { body: { success: true, pricing: INSTANT } };
    return over.parcel ?? { body: { success: true, pricing: PARCEL } };
  };
}

function provider(cfg: BiteshipConfig = config, responder = router()) {
  const m = mockFetch(responder);
  return { p: new BiteshipShippingProvider({ config: cfg, fetchImpl: m.fetchImpl }), calls: m.calls };
}

describe("BiteshipShippingProvider.getRates (SHP-05)", () => {
  it("sends postal-code rates + coordinate rates for instant couriers with the API key", async () => {
    const { p, calls } = provider();
    await p.getRates(req());
    expect(calls).toHaveLength(2);
    for (const c of calls) {
      expect(c.url).toBe("https://api.biteship.test/v1/rates/couriers");
      expect(c.method).toBe("POST");
      expect(c.headers.authorization).toBe("biteship_test.key");
    }
    const parcel = calls.find((c) => "origin_postal_code" in (c.body as object))!.body as Record<string, unknown>;
    expect(parcel).toMatchObject({
      origin_postal_code: 12160,
      destination_postal_code: 11470,
      couriers: "jne,jnt,sicepat,anteraja",
      items: [{ name: "Dancewear", value: 660_000, weight: 450, quantity: 1 }],
    });
    expect(parcel).not.toHaveProperty("courier_insurance");
    const instant = calls.find((c) => "origin_latitude" in (c.body as object))!.body as Record<string, unknown>;
    expect(instant).toMatchObject({
      origin_latitude: -6.2615,
      origin_longitude: 106.8106,
      destination_latitude: -6.1674,
      destination_longitude: 106.7637,
      couriers: "gojek,grab",
    });
  });

  it("maps to ShippingRate: types, eta + unit, our insurance rule, sorted Instan → Express → Reguler", async () => {
    const { p } = provider();
    const rates = await p.getRates(req());
    expect(rates.map((r) => r.serviceCode)).toEqual([
      "grab_same_day", "gojek_instant", // instant, cheapest first
      "anteraja_next_day", "jne_yes",    // express
      "jnt_ez", "jne_reg",               // regular (freight sicepat_gokil dropped)
    ]);
    expect(rates[1]).toEqual({
      serviceCode: "gojek_instant", courier: "Gojek", service: "INSTANT", type: "instant",
      priceIdr: 35000, insuranceIdr: 2500, eta: "1-3", etaUnit: "hours", cutoff: "16:00 WIB",
    });
    expect(rates.find((r) => r.serviceCode === "jne_reg")).toMatchObject({ type: "regular", eta: "1-2", etaUnit: "days", insuranceIdr: 2500 });
    expect(rates.find((r) => r.serviceCode === "jne_yes")).toMatchObject({ type: "express", eta: "1" });
  });

  it("instant rules: only Z1, before cutoff (WIB), within max kg", async () => {
    const after14 = await provider().p.getRates(req({ now: wib(15) }));
    expect(after14.filter((r) => r.type === "instant").map((r) => r.serviceCode)).toEqual(["gojek_instant"]);

    const { p, calls } = provider();
    const after16 = await p.getRates(req({ now: wib(16, 0) }));
    expect(after16.some((r) => r.type === "instant")).toBe(false);
    expect(calls).toHaveLength(1); // no coordinate request at all

    const heavy = await provider().p.getRates(req({ weightGrams: 7000 })); // 8 kg billable > grab 7 kg
    expect(heavy.filter((r) => r.type === "instant").map((r) => r.serviceCode)).toEqual(["gojek_instant"]);

    const z3 = provider();
    const rates = await z3.p.getRates(req({ destination: { province: "Jawa Tengah", city: "Kota Semarang", zone: "Z3", postalCode: "50132" } }));
    expect(rates.some((r) => r.type === "instant")).toBe(false);
    expect(z3.calls).toHaveLength(1);
  });

  it("instant failure never blocks parcel rates; parcel failure throws ProviderHttpError", async () => {
    const { p } = provider(config, router({ instant: { status: 503, body: { success: false, error: "Gojek unavailable", code: 50000000 } } }));
    const rates = await p.getRates(req());
    expect(rates.length).toBe(4);

    const bad = provider(config, router({ parcel: { status: 400, body: { success: false, error: "Invalid destination", code: 40001001 } } }));
    const err = await bad.p.getRates(req()).catch((e) => e);
    expect(err).toBeInstanceOf(ProviderHttpError);
    expect(err).toMatchObject({ status: 400, code: "40001001" });
    expect(err.message).toContain("Invalid destination");
  });

  it("no destination postal code → area ids via /v1/maps/areas (cached)", async () => {
    const cfg = { ...config, origin: { areaId: "IDNP6ORIGIN", latitude: undefined, longitude: undefined } };
    const { p, calls } = provider(cfg);
    const r = req({ destination: { province: "Jawa Barat", city: "Kota Bandung", zone: "Z2", postalCode: "" } });
    await p.getRates(r);
    await p.getRates(r);
    const areaCalls = calls.filter((c) => c.url.includes("/v1/maps/areas"));
    expect(areaCalls).toHaveLength(1);
    const u = new URL(areaCalls[0].url);
    expect(u.searchParams.get("input")).toBe("Kota Bandung, Jawa Barat");
    expect(u.searchParams.get("countries")).toBe("ID");
    const rates = calls.find((c) => c.url.endsWith("/v1/rates/couriers"))!.body;
    expect(rates).toMatchObject({ origin_area_id: "IDNP6ORIGIN", destination_area_id: "IDNP6IDNC148IDND836" });
  });

  it("BITESHIP_USE_COURIER_INSURANCE: passes courier_insurance and uses insurance_fee", async () => {
    const withIns = [pricing("jne", "reg", "standard", 13000, "1 - 2", "days", { shipping_fee: 10000, insurance_fee: 3000 })];
    const { p, calls } = provider({ ...config, couriers: "jne", useCourierInsurance: true }, router({ parcel: { body: { pricing: withIns } } }));
    const [rate] = await p.getRates(req());
    expect(calls[0].body).toMatchObject({ courier_insurance: 660_000 });
    expect(rate).toMatchObject({ priceIdr: 10000, insuranceIdr: 3000 });
  });
});

describe("BiteshipShippingProvider.getTracking", () => {
  it("GET /v1/trackings/{awb}/couriers/{code}; history oldest first", async () => {
    const tracking = {
      body: {
        success: true,
        status: "delivered",
        history: [
          { note: "Delivered to recipient", updated_at: "2026-11-07T10:00:00+07:00", status: "delivered" },
          { note: "Picked up", updated_at: "2026-11-06T09:00:00+07:00", status: "picked" },
          { note: "bad", updated_at: "nope", status: "x" },
        ],
      },
    };
    const { p, calls } = provider(config, router({ tracking }));
    const h = await p.getTracking("J&T", "JP1234567890");
    expect(calls[0].method).toBe("GET");
    expect(calls[0].url).toBe("https://api.biteship.test/v1/trackings/JP1234567890/couriers/jnt");
    expect(h).toEqual([
      { status: "picked", at: new Date("2026-11-06T02:00:00Z"), note: "Picked up" },
      { status: "delivered", at: new Date("2026-11-07T03:00:00Z"), note: "Delivered to recipient" },
    ]);
  });

  it("normalises courier names", () => {
    expect(biteshipCourierCode("JNE")).toBe("jne");
    expect(biteshipCourierCode("GoSend")).toBe("gojek");
    expect(biteshipCourierCode("GrabExpress")).toBe("grab");
    expect(biteshipCourierCode("SiCepat")).toBe("sicepat");
  });
});

describe("biteshipConfigFromEnv", () => {
  it("requires the API key and an origin; parses optional values", () => {
    expect(() => biteshipConfigFromEnv({})).toThrow(/not configured: missing BITESHIP_API_KEY/);
    expect(() => biteshipConfigFromEnv({ BITESHIP_API_KEY: "k" })).toThrow(/BITESHIP_ORIGIN_AREA_ID or BITESHIP_ORIGIN_POSTAL_CODE/);
    expect(() => biteshipConfigFromEnv({ BITESHIP_API_KEY: "k", BITESHIP_ORIGIN_POSTAL_CODE: "123" })).toThrow(/5 digits/);
    expect(
      biteshipConfigFromEnv({
        BITESHIP_API_KEY: "k",
        BITESHIP_ORIGIN_POSTAL_CODE: "12160",
        BITESHIP_ORIGIN_LATITUDE: "-6.26",
        BITESHIP_ORIGIN_LONGITUDE: "106.81",
      }),
    ).toMatchObject({ apiKey: "k", origin: { postalCode: 12160, latitude: -6.26, longitude: 106.81 }, couriers: "jne,jnt,sicepat,anteraja,gojek,grab", useCourierInsurance: false });
  });
});
