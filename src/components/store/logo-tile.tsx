import { cn } from "@/lib/utils/cn";

/**
 * Neutral text "logo" tiles for payment methods & couriers. Deliberately NOT the real trademark artwork
 * (demo). Swap for official SVGs (grayscale idle / colour selected) when the merchant has rights.
 */
export const LOGO_TEXT: Record<string, string> = {
  QRIS: "QRIS",
  GOPAY: "GoPay",
  OVO: "OVO",
  DANA: "DANA",
  SHOPEEPAY: "ShopeePay",
  BCA: "BCA",
  MANDIRI: "Mandiri",
  BNI: "BNI",
  BRI: "BRI",
  PERMATA: "Permata",
  CARD: "Card",
  VISA: "VISA",
  MASTERCARD: "Mastercard",
  JCB: "JCB",
  JNE: "JNE",
  "J&T": "J&T",
  JNT: "J&T",
  SICEPAT: "SiCepat",
  SiCepat: "SiCepat",
  ANTERAJA: "AnterAja",
  AnterAja: "AnterAja",
  GOSEND: "GoSend",
  GoSend: "GoSend",
  GRAB: "GrabExpress",
  GrabExpress: "GrabExpress",
  LALAMOVE: "Lalamove",
  Lalamove: "Lalamove",
  POS: "POS",
};

export interface LogoTileProps {
  /** Channel / courier code, e.g. "BCA", "GOPAY", "JNE". Unknown codes render as-is. */
  code: string;
  size?: "sm" | "md";
  /** Selected/active = ink text & border; idle = muted ("grayscale"). */
  active?: boolean;
  className?: string;
}

/** Rounded text badge standing in for a brand logo. Decorative: pair it with a visible name. */
export function LogoTile({ code, size = "md", active = true, className }: LogoTileProps) {
  const text = LOGO_TEXT[code] ?? code;
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-sm border bg-surface font-semibold tracking-tight",
        size === "md" ? "h-8 min-w-14 px-2 text-xs" : "h-6 min-w-11 px-1.5 text-[10px]",
        active ? "border-border-strong text-ink" : "border-border text-ink-subtle",
        className,
      )}
    >
      {text}
    </span>
  );
}
