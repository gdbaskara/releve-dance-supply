import { TZDate } from "@date-fns/tz";
import { format } from "date-fns";
import { id as idLocale, enUS } from "date-fns/locale";

export const TZ = "Asia/Jakarta";

/** "5 Nov 2026" */
export function formatDateWIB(date: Date, locale: "id" | "en" = "id"): string {
  return format(new TZDate(date, TZ), "d MMM yyyy", { locale: locale === "id" ? idLocale : enUS });
}

/** "5 Nov 2026, 14.30 WIB" (id) / "5 Nov 2026, 14:30 WIB" (en) */
export function formatDateTimeWIB(date: Date, locale: "id" | "en" = "id"): string {
  const pattern = locale === "id" ? "d MMM yyyy, HH.mm" : "d MMM yyyy, HH:mm";
  return `${format(new TZDate(date, TZ), pattern, { locale: locale === "id" ? idLocale : enUS })} WIB`;
}

/** Hour & minute in WIB, for courier cut-offs */
export function wibHourMinute(date: Date): { h: number; m: number } {
  const z = new TZDate(date, TZ);
  return { h: z.getHours(), m: z.getMinutes() };
}
