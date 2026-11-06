"use client";

import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { PageError } from "@/components/store/page-error";
import type { Locale } from "@/lib/contracts";

/** Store pages that fail on the server (e.g. database down) land here inside the store chrome. */
export default function StoreError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations("common.errorPage");
  const locale = useLocale() as Locale;
  return (
    <PageError
      reset={reset}
      locale={locale}
      withWhatsApp
      home={
        <Button asChild variant="secondary">
          <Link href="/">{t("home")}</Link>
        </Button>
      }
    />
  );
}
