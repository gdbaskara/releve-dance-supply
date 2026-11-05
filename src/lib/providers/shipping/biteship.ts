/**
 * BiteshipShippingProvider (SHP-05) — Biteship Rates + Tracking API. Server-only.
 *
 * - Auth: header `authorization: <BITESHIP_API_KEY>` (biteship_test.… / biteship_live.…).
 * - Rates: POST /v1/rates/couriers. Biteship needs the same location type on both sides:
 *   postal code ↔ postal code, or area id ↔ area id (area ids resolved via GET /v1/maps/areas, cached).
 *   Instant couriers (gojek, grab) are priced by coordinates, so they get a second request with the
 *   warehouse coordinates and the destination city's centroid (biteship-areas.ts) — Z1 only.
 * - Our business rules still apply on top of Biteship (same as the mock, docs/05 §5):
 *   instant only Z1, before the cutoff in WIB, within max kg; insurance = max(Rp2.500, 0,25 %) unless
 *   BITESHIP_USE_COURIER_INSURANCE=true (then Biteship's `insurance_fee` is used); order Instan → Express → Reguler.
 * - serviceCode = `<courier_code>_<courier_service_code>` (e.g. jne_reg, jne_yes) — stable across quotes,
 *   so createOrder's server-side re-quote matches what the buyer picked.
 *
 * ASSUMPTIONS to verify against the sandbox key: `pricing[].service_type` ∈ instant | same_day | overnight |
 * standard; `shipment_duration_range` like "1 - 2"; `shipping_type` "parcel" for parcels; tracking response
 * `history[]` items carry `status`, `note`, `updated_at`.
 */
import type { ShippingProvider, ShippingRate, ShippingRateRequest, ShippingType } from "@/lib/contracts";
import { wibHourMinute } from "@/lib/format/date";
import { MOCK_RATES } from "@/lib/data/rates";
import { biteshipConfigFromEnv, type BiteshipConfig } from "../config";
import { requestJson, type FetchLike } from "../http";
import { billableKg, insuranceFor } from "./mock";
import { Z1_CITY_CENTROIDS } from "./biteship-areas";

const INSTANT_COURIERS = new Set(["gojek", "grab"]);
const TYPE_ORDER: Record<ShippingType, number> = { instant: 0, express: 1, regular: 2 };

/** Same windows as data/shipping/mock-rates.json (GoSend Instant / GrabExpress Same Day). */
export const INSTANT_RULES: Record<"instant" | "same_day", { cutoff: string; maxKg: number }> = {
  instant: { cutoff: "16:00 WIB", maxKg: 20 },
  same_day: { cutoff: "14:00 WIB", maxKg: 7 },
};

/** Courier-specific services that Biteship labels "standard" but we sell as Express. */
const EXPRESS_SERVICES = new Set(["jne_yes", "sicepat_best", "anteraja_next_day", "jnt_ez_next_day"]);

export interface BiteshipPricing {
  courier_name?: string;
  courier_code: string;
  courier_service_name?: string;
  courier_service_code: string;
  service_type?: string;
  shipping_type?: string;
  duration?: string;
  shipment_duration_range?: string;
  shipment_duration_unit?: string;
  price?: number;
  shipping_fee?: number;
  insurance_fee?: number;
  available_for_insurance?: boolean;
}
interface BiteshipRatesResponse { success?: boolean; pricing?: BiteshipPricing[] }
interface BiteshipAreasResponse { success?: boolean; areas?: { id: string; name?: string; postal_code?: number | string }[] }
interface BiteshipTrackingResponse {
  success?: boolean;
  status?: string;
  history?: { status?: string; note?: string; updated_at?: string; service_type?: string }[];
}

function biteshipError(body: unknown): { code?: string; message?: string } {
  const b = body as { error?: string; message?: string; code?: number | string } | null;
  return { code: b?.code !== undefined ? String(b.code) : undefined, message: b?.error ?? b?.message };
}

function cutoffMinutes(cutoff: string): number {
  const m = /(\d{1,2})[:.](\d{2})/.exec(cutoff);
  return m ? Number(m[1]) * 60 + Number(m[2]) : 24 * 60;
}

/** "1 - 2" → "1-2", "3" → "3"; falls back to digits in `duration` ("1 - 3 hours"). */
function eta(p: BiteshipPricing): string {
  const src = p.shipment_duration_range ?? p.duration ?? "";
  const m = /(\d+)\s*(?:-\s*(\d+))?/.exec(src);
  if (!m) return "";
  return m[2] && m[2] !== m[1] ? `${m[1]}-${m[2]}` : m[1];
}

/** Maps Biteship courier names (or what an admin typed) to Biteship courier codes. */
export function biteshipCourierCode(courier: string): string {
  const c = courier.trim().toLowerCase().replace(/[^a-z0-9&]/g, "");
  const aliases: Record<string, string> = {
    "j&t": "jnt", jt: "jnt", jtexpress: "jnt", "j&texpress": "jnt",
    gosend: "gojek", gojek: "gojek", grabexpress: "grab", grab: "grab",
    sicepat: "sicepat", anteraja: "anteraja", jne: "jne",
  };
  return aliases[c] ?? c;
}

export interface BiteshipProviderOptions {
  config?: BiteshipConfig;
  fetchImpl?: FetchLike;
}

export class BiteshipShippingProvider implements ShippingProvider {
  readonly name = "biteship" as const;
  private cfg?: BiteshipConfig;
  private readonly areaCache = new Map<string, string | null>();

  constructor(private readonly opts: BiteshipProviderOptions = {}) {
    this.cfg = opts.config;
  }

  private config(): BiteshipConfig {
    this.cfg ??= biteshipConfigFromEnv();
    return this.cfg;
  }

  private request<T>(path: string, body?: unknown): Promise<T> {
    const c = this.config();
    return requestJson<T>({
      provider: "biteship",
      url: `${c.baseUrl}${path}`,
      method: body === undefined ? "GET" : "POST",
      headers: { authorization: c.apiKey },
      body,
      fetchImpl: this.opts.fetchImpl,
      errorOf: biteshipError,
    });
  }

  /** First Biteship area id for a free-text input (postal code or "city, province"). Cached per instance. */
  async resolveAreaId(input: string): Promise<string | null> {
    if (this.areaCache.has(input)) return this.areaCache.get(input)!;
    const q = new URLSearchParams({ countries: "ID", input, type: "single" });
    const res = await this.request<BiteshipAreasResponse>(`/v1/maps/areas?${q.toString()}`);
    const id = res.areas?.[0]?.id ?? null;
    this.areaCache.set(input, id);
    return id;
  }

  async getRates(req: ShippingRateRequest): Promise<ShippingRate[]> {
    const c = this.config();
    const kg = billableKg(req.weightGrams);
    const grams = Math.max(1, Math.round(req.weightGrams + MOCK_RATES.packaging_add_grams));
    const items = [{ name: "Dancewear", description: "Relevé Dance Supply order", value: req.itemValueIdr, weight: grams, quantity: 1 }];
    const insurance = c.useCourierInsurance ? { courier_insurance: req.itemValueIdr } : {};
    const couriers = c.couriers.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
    const parcelCouriers = couriers.filter((x) => !INSTANT_COURIERS.has(x));
    const instantCouriers = couriers.filter((x) => INSTANT_COURIERS.has(x));

    const { h, m } = wibHourMinute(req.now);
    const nowMin = h * 60 + m;
    const latestCutoff = Math.max(...Object.values(INSTANT_RULES).map((r) => cutoffMinutes(r.cutoff)));
    const centroid = Z1_CITY_CENTROIDS[req.destination.city];
    const canInstant =
      instantCouriers.length > 0 &&
      req.destination.zone === "Z1" &&
      nowMin < latestCutoff &&
      centroid !== undefined &&
      c.origin.latitude !== undefined &&
      c.origin.longitude !== undefined;

    const parcelQuote = async (): Promise<BiteshipPricing[]> => {
      if (parcelCouriers.length === 0) return [];
      const destPostal = /^\d{5}$/.test(req.destination.postalCode) ? Number(req.destination.postalCode) : undefined;
      let location: Record<string, unknown>;
      if (c.origin.postalCode !== undefined && destPostal !== undefined) {
        location = { origin_postal_code: c.origin.postalCode, destination_postal_code: destPostal };
      } else {
        const originArea = c.origin.areaId ?? (await this.resolveAreaId(String(c.origin.postalCode)));
        const destArea = await this.resolveAreaId(destPostal !== undefined ? String(destPostal) : `${req.destination.city}, ${req.destination.province}`);
        if (!originArea || !destArea) throw new Error(`Biteship: no area found for ${!originArea ? "origin" : req.destination.city}`);
        location = { origin_area_id: originArea, destination_area_id: destArea };
      }
      const res = await this.request<BiteshipRatesResponse>("/v1/rates/couriers", {
        ...location,
        couriers: parcelCouriers.join(","),
        items,
        ...insurance,
      });
      return res.pricing ?? [];
    };

    const instantQuote = async (): Promise<BiteshipPricing[]> => {
      if (!canInstant) return [];
      try {
        const res = await this.request<BiteshipRatesResponse>("/v1/rates/couriers", {
          origin_latitude: c.origin.latitude,
          origin_longitude: c.origin.longitude,
          destination_latitude: centroid.latitude,
          destination_longitude: centroid.longitude,
          couriers: instantCouriers.join(","),
          items,
          ...insurance,
        });
        return res.pricing ?? [];
      } catch (err) {
        // Instant is a bonus: never block regular/express quotes because GoSend/Grab is unavailable.
        console.error(JSON.stringify({ event: "biteship.instant_failed", error: String(err) }));
        return [];
      }
    };

    const [parcel, instant] = await Promise.all([parcelQuote(), instantQuote()]);
    const ourInsurance = insuranceFor(req.itemValueIdr);
    const rates: ShippingRate[] = [];
    const seen = new Set<string>();

    for (const p of [...instant, ...parcel]) {
      if (!p?.courier_code || !p.courier_service_code) continue;
      if (p.shipping_type && p.shipping_type !== "parcel") continue; // no freight/cargo
      const serviceCode = `${p.courier_code}_${p.courier_service_code}`.toLowerCase();
      if (seen.has(serviceCode)) continue;

      const st = (p.service_type ?? "").toLowerCase();
      let type: ShippingType;
      let cutoff: string | undefined;
      if (st === "instant" || st === "same_day") {
        const rule = INSTANT_RULES[st];
        if (!canInstant || kg > rule.maxKg || nowMin >= cutoffMinutes(rule.cutoff)) continue;
        type = "instant";
        cutoff = rule.cutoff;
      } else if (INSTANT_COURIERS.has(p.courier_code)) {
        continue; // e.g. scheduled/bike services we don't sell
      } else {
        type = st === "overnight" || EXPRESS_SERVICES.has(serviceCode) ? "express" : "regular";
      }

      const courierInsurance = c.useCourierInsurance && typeof p.insurance_fee === "number" ? p.insurance_fee : undefined;
      const gross = typeof p.price === "number" ? p.price : (p.shipping_fee ?? NaN);
      const priceIdr = Math.round(courierInsurance !== undefined ? (p.shipping_fee ?? gross - courierInsurance) : gross);
      if (!Number.isFinite(priceIdr) || priceIdr <= 0) continue;

      const unit = (p.shipment_duration_unit ?? "").toLowerCase();
      const etaUnit: "days" | "hours" = unit.startsWith("hour") ? "hours" : unit.startsWith("day") ? "days" : type === "instant" ? "hours" : "days";
      seen.add(serviceCode);
      rates.push({
        serviceCode,
        courier: p.courier_name ?? p.courier_code.toUpperCase(),
        service: p.courier_service_name ?? p.courier_service_code,
        type,
        priceIdr,
        insuranceIdr: courierInsurance !== undefined ? Math.round(courierInsurance) : ourInsurance,
        eta: eta(p),
        etaUnit,
        ...(cutoff ? { cutoff } : {}),
      });
    }
    return rates.sort((a, b) => TYPE_ORDER[a.type] - TYPE_ORDER[b.type] || a.priceIdr - b.priceIdr);
  }

  /** Public tracking by waybill: GET /v1/trackings/{awb}/couriers/{courier_code}. Oldest entry first. */
  async getTracking(courier: string, awb: string): Promise<{ status: string; at: Date; note?: string }[]> {
    const code = biteshipCourierCode(courier);
    const res = await this.request<BiteshipTrackingResponse>(
      `/v1/trackings/${encodeURIComponent(awb.trim())}/couriers/${encodeURIComponent(code)}`,
    );
    return (res.history ?? [])
      .map((h) => ({ status: (h.status ?? "unknown").toLowerCase(), at: new Date(h.updated_at ?? NaN), note: h.note || undefined }))
      .filter((h) => !Number.isNaN(h.at.getTime()))
      .sort((a, b) => a.at.getTime() - b.at.getTime());
  }
}
