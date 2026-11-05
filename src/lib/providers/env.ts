/** Server-side environment helpers (read lazily so tests can override process.env). */
export function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/+$/, "");
}

export function isDemoMode(): boolean {
  return process.env.DEMO_MODE === "true";
}

export function webhookSecret(): string {
  const s = process.env.WEBHOOK_SECRET;
  if (!s) throw new Error("WEBHOOK_SECRET is not set");
  return s;
}

export function referenceImagesEnabled(): boolean {
  return process.env.DEMO_USE_REFERENCE_IMAGES === "true";
}
