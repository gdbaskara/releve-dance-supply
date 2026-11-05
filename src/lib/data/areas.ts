/**
 * Java shipping areas (data/shipping/java-areas.json). Pure & client-safe:
 * the checkout UI can import JAVA_PROVINCES / getCities for its dropdowns,
 * and the server derives the zone with resolveZone() (never trust the client's zone).
 */
import areasJson from "../../../data/shipping/java-areas.json";
import type { JavaProvince, ShippingZone } from "@/lib/contracts";

export interface JavaCity { name: string; zone: ShippingZone }
export interface JavaProvinceData { name: JavaProvince; cities: JavaCity[] }

const data = areasJson as unknown as {
  origin: { province: JavaProvince; city: string };
  provinces: JavaProvinceData[];
};

export const ORIGIN = data.origin;
export const JAVA_AREAS: JavaProvinceData[] = data.provinces;
export const JAVA_PROVINCES: JavaProvince[] = data.provinces.map((p) => p.name);

export function isJavaProvince(province: string): province is JavaProvince {
  return (JAVA_PROVINCES as string[]).includes(province);
}

export function getCities(province: string): JavaCity[] {
  return data.provinces.find((p) => p.name === province)?.cities ?? [];
}

/** Zone for a (province, city) pair, or null if the pair is not a known Java area. */
export function resolveZone(province: string, city: string): ShippingZone | null {
  return getCities(province).find((c) => c.name === city)?.zone ?? null;
}
