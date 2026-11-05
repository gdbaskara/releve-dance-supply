import * as React from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils/cn";
import { LogoTile } from "./logo-tile";
import { Wordmark } from "./wordmark";

export interface FooterColumn {
  title: string;
  links: { label: string; href: string; external?: boolean }[];
}

export interface FooterProps {
  /** Belanja / Bantuan / Tentang … */
  columns: FooterColumn[];
  /** Contact block (WA link, Jakarta address, opening hours). */
  contact?: React.ReactNode;
  /** Slot in the bottom bar (LanguageToggle). */
  bottomSlot?: React.ReactNode;
  /** Payment tile codes. Default: QRIS, e-wallets, VA banks, VISA, MASTERCARD. */
  paymentCodes?: string[];
  /** Courier tile codes. Default: JNE, J&T, SiCepat, AnterAja, GoSend, GrabExpress. */
  courierCodes?: string[];
  linkAs?: React.ElementType;
  className?: string;
}

const PAY = ["QRIS", "GOPAY", "OVO", "DANA", "SHOPEEPAY", "BCA", "MANDIRI", "BNI", "BRI", "PERMATA", "VISA", "MASTERCARD"];
const COURIERS = ["JNE", "J&T", "SiCepat", "AnterAja", "GoSend", "GrabExpress"];

/** Presentational footer on `surface-alt`: columns · contact · payment & courier tiles · disclaimer. */
export function Footer({ columns, contact, bottomSlot, paymentCodes = PAY, courierCodes = COURIERS, linkAs: LinkComp = "a", className }: FooterProps) {
  const t = useTranslations("common");
  return (
    <footer className={cn("bg-surface-alt text-ink", className)}>
      <div className="container-page flex flex-col gap-10 py-12 lg:py-16">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4 lg:grid-cols-[1.4fr_repeat(4,1fr)]">
          <div className="col-span-2 flex flex-col items-start gap-4 md:col-span-4 lg:col-span-1">
            <Wordmark size="md" />
            <p className="max-w-xs text-sm text-ink-muted">{t("trust.original")} · {t("trust.jakarta")}</p>
          </div>
          {columns.map((col) => (
            <div key={col.title} className="flex flex-col gap-3">
              <h2 className="eyebrow text-ink">{col.title}</h2>
              <ul className="flex flex-col">
                {col.links.map((l) => (
                  <li key={l.href}>
                    <LinkComp
                      href={l.href}
                      {...(l.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                      className="inline-flex min-h-9 items-center rounded-sm text-sm text-ink-muted hover:text-ink hover:underline focus-visible:outline-2 focus-visible:outline-focus"
                    >
                      {l.label}
                    </LinkComp>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          {contact ? <div className="col-span-2 flex flex-col gap-3 text-sm md:col-span-1">{contact}</div> : null}
        </div>
        <div className="flex flex-col gap-6 border-t border-border pt-8 lg:flex-row lg:justify-between">
          <div className="flex flex-col gap-3">
            <h2 className="eyebrow text-ink-muted">{t("footer.payments")}</h2>
            <ul className="flex flex-wrap gap-2">
              {paymentCodes.map((c) => (
                <li key={c}>
                  <LogoTile code={c} size="sm" />
                  <span className="sr-only">{c}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="flex flex-col gap-3">
            <h2 className="eyebrow text-ink-muted">{t("footer.couriers")}</h2>
            <ul className="flex flex-wrap gap-2">
              {courierCodes.map((c) => (
                <li key={c}>
                  <LogoTile code={c} size="sm" />
                  <span className="sr-only">{c}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="flex flex-col gap-4 border-t border-border pt-6 md:flex-row md:items-center md:justify-between">
          <p className="max-w-2xl text-xs text-ink-muted">{t("disclaimer")}</p>
          {bottomSlot}
        </div>
      </div>
    </footer>
  );
}
