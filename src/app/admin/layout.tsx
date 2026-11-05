import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getTranslations } from "next-intl/server";
import { ToastProvider } from "@/components/ui/toast";
import { getAdminLocale } from "@/i18n/admin-locale.server";
import { loadAdminMessages } from "../../../messages";
import "../globals.css";

const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-jakarta" });

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin.meta");
  return {
    title: { default: t("titleDefault"), template: t("titleTemplate") },
    robots: { index: false, follow: false },
  };
}

/**
 * Root layout for /admin (outside the [locale] tree, URLs have no locale prefix). The admin UI is available in
 * Bahasa Indonesia (default) and English, chosen by the `admin_locale` cookie (docs/10 D-31, supersedes D-WS5;
 * set via the ID / EN toggle -> setAdminLocaleAction). Server components read the same cookie through
 * src/i18n/request.ts; client components get `common` (shared UI primitives) + `admin` through the provider below.
 */
export default async function AdminRootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getAdminLocale();
  const messages = await loadAdminMessages(locale);
  return (
    <html lang={locale} className={jakarta.variable}>
      <body className="min-h-dvh bg-surface-alt text-ink antialiased">
        <NextIntlClientProvider locale={locale} timeZone="Asia/Jakarta" messages={messages}>
          <ToastProvider>{children}</ToastProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
