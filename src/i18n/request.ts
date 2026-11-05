import { loadAdminMessages, loadMessages } from "../../messages";
import { getRequestConfig } from "next-intl/server";
import { hasLocale } from "next-intl";
import { routing } from "./routing";
import { getAdminLocale } from "./admin-locale.server";

const TIME_ZONE = "Asia/Jakarta";

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  if (requested === undefined) {
    // Rendering outside the [locale] segment: only the /admin tree does that (src/proxy.ts skips the intl
    // middleware for /admin). Its locale comes from the admin_locale cookie and it loads `common` + `admin` only.
    const locale = await getAdminLocale();
    return { locale, timeZone: TIME_ZONE, messages: await loadAdminMessages(locale) };
  }
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;
  return {
    locale,
    timeZone: TIME_ZONE,
    messages: await loadMessages(locale),
  };
});
