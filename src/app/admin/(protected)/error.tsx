"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { PageError } from "@/components/store/page-error";
import type { Locale } from "@/lib/contracts";

/** Admin pages that fail on the server keep the admin shell and offer a retry. */
export default function AdminError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations("common.errorPage");
  return (
    <PageError
      reset={reset}
      locale={useLocale() as Locale}
      home={
        <Button asChild variant="secondary">
          <Link href="/admin">{t("adminHome")}</Link>
        </Button>
      }
    />
  );
}
