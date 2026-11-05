"use client";

import * as React from "react";
import QRCode from "qrcode";
import { useTranslations } from "next-intl";
import { Download } from "lucide-react";
import { formatIDR } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";
import { LogoTile } from "@/components/store/logo-tile";
import { Countdown } from "./countdown";

/** Build an SVG path ("M x y h1 v1 h-1 z …") for the QR modules — synchronous, SSR-safe. */
export function qrSvgMarkup(text: string, opts: { margin?: number; dark?: string; light?: string } = {}): { svg: string; size: number } {
  const margin = opts.margin ?? 2;
  const qr = QRCode.create(text, { errorCorrectionLevel: "M" });
  const n = qr.modules.size;
  let d = "";
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      if (qr.modules.get(y, x)) d += `M${x + margin} ${y + margin}h1v1h-1z`;
    }
  }
  const size = n + margin * 2;
  const dark = opts.dark ?? "#141414";
  const light = opts.light ?? "#FFFFFF";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges"><rect width="100%" height="100%" fill="${light}"/><path d="${d}" fill="${dark}"/></svg>`;
  return { svg, size };
}

export interface QRCodeSvgProps {
  value: string;
  /** Rendered px size. Default 240. */
  size?: number;
  label: string;
  className?: string;
}

/** QR as inline SVG (ink on white) from the `qrcode` package. */
export function QRCodeSvg({ value, size = 240, label, className }: QRCodeSvgProps) {
  const { svg } = React.useMemo(() => qrSvgMarkup(value, { margin: 0 }), [value]);
  const dataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- data: URL SVG, next/image adds nothing here
    <img src={dataUrl} width={size} height={size} alt={label} className={className} style={{ imageRendering: "pixelated" }} />
  );
}

export interface QRISPanelProps {
  /** EMV QRIS payload from PaymentInstruction.qrString. */
  qrString: string;
  amountIdr: number;
  expiresAt: Date | string | number;
  onExpire?: () => void;
  /** Order number, used in the downloaded filename. */
  orderNo?: string;
}

const SUPPORTED = ["GOPAY", "OVO", "DANA", "SHOPEEPAY", "BCA", "MANDIRI", "BNI", "BRI"];

/** QRIS tile · 240px QR (white, padding 16) · amount + Salin · Countdown · Unduh QR · 3 steps · supported apps. */
export function QRISPanel({ qrString, amountIdr, expiresAt, onExpire, orderNo }: QRISPanelProps) {
  const t = useTranslations("common");
  const download = () => {
    const { svg } = qrSvgMarkup(qrString, { margin: 4 });
    const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `QRIS-${orderNo ?? "releve"}.svg`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return (
    <div className="flex flex-col items-center gap-5">
      <LogoTile code="QRIS" />
      <div className="rounded-md border border-border bg-white p-4">
        <QRCodeSvg value={qrString} size={240} label={t("pay.qrAlt", { amount: formatIDR(amountIdr) })} className="size-[240px] max-w-full" />
      </div>
      <div className="flex w-full items-center justify-between gap-4 border-y border-border py-3">
        <div className="flex flex-col">
          <span className="eyebrow text-ink-muted">{t("pay.amount")}</span>
          <span className="tabular text-xl font-semibold">{formatIDR(amountIdr)}</span>
        </div>
        <CopyButton value={String(amountIdr)} ariaLabel={t("pay.copyAmount")} />
      </div>
      <Countdown expiresAt={expiresAt} onExpire={onExpire} className="w-full" />
      <Button variant="secondary" fullWidth onClick={download} leadingIcon={<Download size={18} strokeWidth={1.5} aria-hidden />}>
        {t("pay.downloadQr")}
      </Button>
      <ol className="flex w-full flex-col gap-3">
        {(["1", "2", "3"] as const).map((n) => (
          <li key={n} className="flex items-start gap-3 text-sm">
            <span className="tabular inline-flex size-6 shrink-0 items-center justify-center rounded-pill bg-surface-alt text-xs font-semibold">{n}</span>
            <span className="pt-0.5">{t(`pay.qrisSteps.${n}`)}</span>
          </li>
        ))}
      </ol>
      <div className="flex w-full flex-col gap-2">
        <span className="eyebrow text-ink-muted">{t("pay.supported")}</span>
        <div className="flex flex-wrap gap-1.5">
          {SUPPORTED.map((c) => (
            <LogoTile key={c} code={c} size="sm" active={false} />
          ))}
        </div>
      </div>
    </div>
  );
}
