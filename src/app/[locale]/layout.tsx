import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Cormorant_Garamond } from "next/font/google";
import { notFound } from "next/navigation";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { Providers } from "./providers";
import "../globals.css";

const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-jakarta" });
const cormorant = Cormorant_Garamond({ subsets: ["latin"], weight: ["500"], style: ["normal", "italic"], variable: "--font-cormorant" });

export const metadata: Metadata = {
  title: { default: "Relevé Dance Supply", template: "%s · Relevé Dance Supply" },
  description: "Sepatu & dancewear Só Dança original. Dikirim dari Jakarta, bayar QRIS, VA & e-wallet.",
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({ children, params }: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  return (
    <html lang={locale} className={`${jakarta.variable} ${cormorant.variable}`}>
      <body className="min-h-dvh bg-bg text-ink antialiased">
        <NextIntlClientProvider>
          <Providers>{children}</Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
