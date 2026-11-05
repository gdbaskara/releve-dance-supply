/** Mock shipping tariff table (data/shipping/mock-rates.json). Pure, client-safe. */
import ratesJson from "../../../data/shipping/mock-rates.json";
import type { ShippingType, ShippingZone } from "@/lib/contracts";

export interface MockRateService {
  code: string;
  courier: string;
  service: string;
  type: ShippingType;
  per_kg?: Partial<Record<ShippingZone, number>>;
  eta_days?: Partial<Record<ShippingZone, string>>;
  flat?: Partial<Record<ShippingZone, number>>;
  eta_hours?: string;
  max_kg?: number;
  cutoff?: string; // "16:00 WIB"
}

export interface MockRateTable {
  services: MockRateService[];
  insurance: { default_on: boolean; rate_pct: number; min_idr: number };
  packaging_add_grams: number;
}

export const MOCK_RATES = ratesJson as unknown as MockRateTable;
