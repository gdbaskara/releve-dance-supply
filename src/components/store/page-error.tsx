"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { buildWaLink } from "@/lib/wa";
import type { Locale } from "@/lib/contracts";
import { EmptyState } from "./empty-state";
import { WhatsAppButton } from "./whatsapp-button";

export interface PageErrorProps {
  reset: () => void;
  /** Link back to a safe page (store home or admin dashboard). */
  home: React.ReactNode;
  /** Show the WhatsApp fallback (shoppers only). */
  withWhatsApp?: boolean;
  locale: Locale;
}

/** Error state for a route segment (R-27). Never shows the raw error: it can carry server details. */
export function PageError({ reset, home, withWhatsApp, locale }: PageErrorProps) {
  const t = useTranslations("common.errorPage");
  return (
    <div className="container-page py-16">
      <EmptyState
        icon={<RotateCcw size={40} strokeWidth={1} />}
        title={t("title")}
        description={t("body")}
        actions={
          <>
            <Button type="button" onClick={reset}>
              {t("retry")}
            </Button>
            {home}
            {withWhatsApp ? <WhatsAppButton variant="link" href={buildWaLink("general", undefined, locale)} label={t("wa")} /> : null}
          </>
        }
      />
    </div>
  );
}
