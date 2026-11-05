/**
 * MockShippingProvider — docs/05 §5 + SHP-02, reads data/shipping/mock-rates.json.
 * - billable kg = ceil((weightGrams + packaging 150 g) / 1000), min 1
 * - regular/express = per_kg[zone] × kg
 * - instant = flat[zone], only if zone has a flat price (Z1), kg ≤ max_kg and now (WIB) < cutoff
 * - insurance = max(min_idr, ceil(0.25% × item value))
 * - order: instant → express → regular, cheapest first in each group
 */
import type { ShippingProvider, ShippingRate, ShippingRateRequest, ShippingType } from "@/lib/contracts";
import { wibHourMinute } from "@/lib/format/date";
import { MOCK_RATES, type MockRateTable } from "@/lib/data/rates";

const TYPE_ORDER: Record<ShippingType, number> = { instant: 0, express: 1, regular: 2 };

export function billableKg(weightGrams: number, table: MockRateTable = MOCK_RATES): number {
  return Math.max(1, Math.ceil((Math.max(0, weightGrams) + table.packaging_add_grams) / 1000));
}

export function insuranceFor(itemValueIdr: number, table: MockRateTable = MOCK_RATES): number {
  return Math.max(table.insurance.min_idr, Math.ceil((itemValueIdr * table.insurance.rate_pct) / 100));
}

/** "16:00 WIB" → minutes since midnight */
function cutoffMinutes(cutoff: string): number {
  const m = /(\d{1,2})[:.](\d{2})/.exec(cutoff);
  return m ? Number(m[1]) * 60 + Number(m[2]) : 24 * 60;
}

export class MockShippingProvider implements ShippingProvider {
  readonly name = "mock" as const;
  constructor(private readonly table: MockRateTable = MOCK_RATES) {}

  async getRates(req: ShippingRateRequest): Promise<ShippingRate[]> {
    const zone = req.destination.zone;
    const kg = billableKg(req.weightGrams, this.table);
    const insuranceIdr = insuranceFor(req.itemValueIdr, this.table);
    const { h, m } = wibHourMinute(req.now);
    const nowMin = h * 60 + m;
    const rates: ShippingRate[] = [];
    for (const s of this.table.services) {
      if (s.type === "instant") {
        const flat = s.flat?.[zone];
        if (flat === undefined) continue;
        if (s.max_kg !== undefined && kg > s.max_kg) continue;
        if (s.cutoff && nowMin >= cutoffMinutes(s.cutoff)) continue;
        rates.push({
          serviceCode: s.code, courier: s.courier, service: s.service, type: s.type,
          priceIdr: flat, insuranceIdr, eta: s.eta_hours ?? "", etaUnit: "hours", cutoff: s.cutoff,
        });
      } else {
        const perKg = s.per_kg?.[zone];
        if (perKg === undefined) continue;
        rates.push({
          serviceCode: s.code, courier: s.courier, service: s.service, type: s.type,
          priceIdr: perKg * kg, insuranceIdr, eta: s.eta_days?.[zone] ?? "", etaUnit: "days",
        });
      }
    }
    return rates.sort((a, b) => TYPE_ORDER[a.type] - TYPE_ORDER[b.type] || a.priceIdr - b.priceIdr);
  }

  async getTracking(courier: string, awb: string) {
    void courier;
    void awb;
    return [] as { status: string; at: Date; note?: string }[];
  }
}
