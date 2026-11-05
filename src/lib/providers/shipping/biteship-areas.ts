/**
 * Approximate city centroids for Z1 (Jabodetabek) — used ONLY to quote instant/same-day couriers
 * (GoSend, GrabExpress), which Biteship prices by coordinates. The checkout collects no map pin yet,
 * so the quote is an estimate for the city; when orders are created through Biteship later, use the
 * buyer's real coordinates. Names match data/shipping/java-areas.json.
 */
export const Z1_CITY_CENTROIDS: Record<string, { latitude: number; longitude: number }> = {
  "Kota Jakarta Pusat": { latitude: -6.1865, longitude: 106.8341 },
  "Kota Jakarta Utara": { latitude: -6.1381, longitude: 106.8661 },
  "Kota Jakarta Barat": { latitude: -6.1674, longitude: 106.7637 },
  "Kota Jakarta Selatan": { latitude: -6.2615, longitude: 106.8106 },
  "Kota Jakarta Timur": { latitude: -6.225, longitude: 106.9004 },
  "Kab. Tangerang": { latitude: -6.175, longitude: 106.53 },
  "Kota Tangerang": { latitude: -6.1781, longitude: 106.63 },
  "Kota Tangerang Selatan": { latitude: -6.2886, longitude: 106.7179 },
  "Kab. Bogor": { latitude: -6.4818, longitude: 106.854 },
  "Kab. Bekasi": { latitude: -6.2849, longitude: 107.1707 },
  "Kota Bogor": { latitude: -6.5971, longitude: 106.806 },
  "Kota Bekasi": { latitude: -6.2383, longitude: 106.9756 },
  "Kota Depok": { latitude: -6.4025, longitude: 106.7942 },
};
