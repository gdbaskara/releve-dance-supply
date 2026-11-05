/** Server-only: reads the admin UI locale from the `admin_locale` cookie (see ./admin-locale.ts). */
import { cookies } from "next/headers";
import type { Locale } from "@/lib/contracts";
import { ADMIN_LOCALE_COOKIE, parseAdminLocale } from "./admin-locale";

export async function getAdminLocale(): Promise<Locale> {
  const store = await cookies();
  return parseAdminLocale(store.get(ADMIN_LOCALE_COOKIE)?.value);
}
