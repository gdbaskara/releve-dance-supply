"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils/cn";
import { buttonVariants } from "@/components/ui/button";

/** Generic chat-bubble + handset glyph used for WhatsApp actions (same drawing as /public/icons/whatsapp.svg). */
export function WhatsAppIcon({ size = 20, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden className={cn("shrink-0", className)}>
      <path
        d="M12 2.75a9.25 9.25 0 0 0-7.98 13.93L2.75 21.25l4.7-1.23A9.25 9.25 0 1 0 12 2.75Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M8.6 7.4c.25-.25.6-.3.86-.12l1.2.86c.3.22.38.63.2.95l-.5.86c.62 1.25 1.48 2.12 2.72 2.74l.88-.5c.32-.18.73-.1.95.2l.86 1.2c.18.26.13.61-.12.86l-.67.66c-.5.5-1.27.62-1.9.3-2.3-1.15-4-2.86-5.16-5.16-.32-.63-.2-1.4.3-1.9l.38-.75Z"
        fill="currentColor"
      />
    </svg>
  );
}

export interface WhatsAppButtonProps {
  /** Ready wa.me URL — build it with WS-2's link builder (src/lib/wa). */
  href: string;
  /**
   * - `fab`: floating pill 56px, bottom-right; label "Chat" visible from md
   * - `inline`: full Button (whatsapp variant) — PDP, cart, size guide, pay page
   * - `link`: text + icon
   */
  variant?: "fab" | "inline" | "link";
  /** Visible label. Defaults: fab → "Chat", inline/link → "Tanya via WA". */
  label?: string;
  fullWidth?: boolean;
  size?: "md" | "sm";
  className?: string;
  /** Analytics hook. */
  onClick?: () => void;
}

/** WhatsApp entry point. Green is reserved for these elements only. Opens in a new tab. */
export function WhatsAppButton({ href, variant = "inline", label, fullWidth, size = "md", className, onClick }: WhatsAppButtonProps) {
  const t = useTranslations("common");
  const common = { href, target: "_blank", rel: "noopener noreferrer", onClick } as const;
  if (variant === "fab") {
    const text = label ?? t("wa.chat");
    return (
      <a
        {...common}
        aria-label={label ?? t("wa.ask")}
        className={cn(
          "fixed bottom-[max(1rem,env(safe-area-inset-bottom))] right-4 z-40 inline-flex h-14 min-w-14 items-center justify-center gap-2 rounded-pill bg-whatsapp px-4 text-whatsapp-ink shadow-overlay",
          "transition-[filter,transform] duration-150 hover:brightness-95 active:scale-95",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus md:right-6 md:bottom-6 md:px-5",
          className,
        )}
      >
        <WhatsAppIcon size={26} />
        <span className="hidden text-sm font-semibold uppercase tracking-button md:inline">{text}</span>
      </a>
    );
  }
  const text = label ?? t("wa.ask");
  if (variant === "link") {
    return (
      <a
        {...common}
        className={cn(
          "inline-flex min-h-11 items-center gap-2 rounded-sm text-sm font-medium text-ink underline decoration-1 underline-offset-[3px] hover:text-accent-strong",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus",
          className,
        )}
      >
        <span className="inline-flex size-6 items-center justify-center rounded-pill bg-whatsapp text-whatsapp-ink">
          <WhatsAppIcon size={15} />
        </span>
        {text}
      </a>
    );
  }
  return (
    <a {...common} className={cn(buttonVariants({ variant: "whatsapp", size, fullWidth }), className)}>
      <WhatsAppIcon size={size === "sm" ? 16 : 20} />
      {text}
    </a>
  );
}
