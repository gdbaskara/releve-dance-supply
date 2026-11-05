import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { ToastProvider } from "@/components/ui/toast";
import commonId from "../../../messages/id/common.json";
import "../globals.css";

const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-jakarta" });

export const metadata: Metadata = {
  title: { default: "Admin · Relevé", template: "%s · Admin Relevé" },
  robots: { index: false, follow: false },
};

/**
 * Root layout for /admin (outside the [locale] tree). Admin UI is Bahasa Indonesia only; the shared UI primitives
 * still read the `common` namespace (field "(Opsional)", toast close, copy…), so it is provided here with locale "id".
 */
export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={jakarta.variable}>
      <body className="min-h-dvh bg-surface-alt text-ink antialiased">
        <NextIntlClientProvider locale="id" timeZone="Asia/Jakarta" messages={{ common: commonId }}>
          <ToastProvider>{children}</ToastProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
