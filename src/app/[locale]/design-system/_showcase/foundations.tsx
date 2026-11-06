"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import {
  BadgeCheck,
  Bell,
  Check,
  ChevronDown,
  Clock,
  Copy,
  CreditCard,
  Download,
  Info,
  Landmark,
  Lock,
  MapPin,
  Menu,
  Minus,
  Package,
  Plus,
  QrCode,
  Ruler,
  Search,
  ShoppingBag,
  SlidersHorizontal,
  Smartphone,
  Truck,
  Wallet,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { LogoTile } from "@/components/store/logo-tile";
import { ShoePlaceholderArt } from "@/components/store/product-image";
import { WhatsAppIcon } from "@/components/store/whatsapp-button";
import { Group, Specimen } from "./frame";

/* WCAG relative luminance contrast */
function lum(hex: string) {
  const n = hex.replace("#", "");
  const [r, g, b] = [0, 2, 4].map((i) => {
    const c = parseInt(n.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
export function contrast(a: string, b: string) {
  const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
}

/** Token, swatch class (literal so Tailwind sees it), hex, the colour its text is measured against. */
const COLORS: { token: string; cls: string; hex: string; on: string; text?: boolean }[] = [
  { token: "bg / surface", cls: "bg-surface", hex: "#FFFFFF", on: "#141414" },
  { token: "surface-alt", cls: "bg-surface-alt", hex: "#F7F4F0", on: "#141414" },
  { token: "ink", cls: "bg-ink", hex: "#141414", on: "#FFFFFF", text: true },
  { token: "ink-hover", cls: "bg-ink-hover", hex: "#2B2B2B", on: "#FFFFFF" },
  { token: "ink-muted", cls: "bg-ink-muted", hex: "#5E5852", on: "#FFFFFF", text: true },
  { token: "ink-subtle", cls: "bg-ink-subtle", hex: "#736C66", on: "#FFFFFF", text: true },
  { token: "border", cls: "bg-border", hex: "#E6E1DB", on: "#141414" },
  { token: "border-strong", cls: "bg-border-strong", hex: "#8A837C", on: "#FFFFFF", text: true },
  { token: "accent", cls: "bg-accent", hex: "#F3E1DD", on: "#7E3845" },
  { token: "accent-strong", cls: "bg-accent-strong", hex: "#9A4A57", on: "#FFFFFF", text: true },
  { token: "accent-ink", cls: "bg-accent-ink", hex: "#7E3845", on: "#F3E1DD", text: true },
  { token: "success", cls: "bg-success", hex: "#1F7A4D", on: "#FFFFFF", text: true },
  { token: "success-bg", cls: "bg-success-bg", hex: "#E7F4EC", on: "#1F7A4D" },
  { token: "warning", cls: "bg-warning", hex: "#8A5A00", on: "#FFFFFF", text: true },
  { token: "warning-bg", cls: "bg-warning-bg", hex: "#FBF1DC", on: "#8A5A00" },
  { token: "error", cls: "bg-error", hex: "#B3261E", on: "#FFFFFF", text: true },
  { token: "error-bg", cls: "bg-error-bg", hex: "#FBE9E7", on: "#B3261E" },
  { token: "info", cls: "bg-info", hex: "#2A5DB0", on: "#FFFFFF", text: true },
  { token: "info-bg", cls: "bg-info-bg", hex: "#E8EFFA", on: "#2A5DB0" },
  { token: "whatsapp", cls: "bg-whatsapp", hex: "#25D366", on: "#0B2A17" },
  { token: "whatsapp-ink", cls: "bg-whatsapp-ink", hex: "#0B2A17", on: "#25D366", text: true },
];

const ICONS = { Search, ShoppingBag, Menu, X, ChevronDown, Check, Plus, Minus, Copy, Download, Info, Clock, Truck, Package, MapPin, QrCode, Wallet, Landmark, CreditCard, Smartphone, Lock, Ruler, BadgeCheck, Bell, SlidersHorizontal };

export function Foundations() {
  const t = useTranslations("designSystem");
  return (
    <>
      <Group title={t("foundations.colors.title")} description={t("foundations.colors.description")}>
        <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {COLORS.map((c) => {
            const pair = contrast(c.hex, c.on);
            const vsWhite = contrast(c.hex, "#FFFFFF");
            const ratio = c.text ? vsWhite : pair;
            const aa = ratio >= 4.5 ? "AA" : ratio >= 3 ? "AA 18px+ / UI" : null;
            return (
              <li key={c.token} className="flex flex-col overflow-hidden rounded-md border border-border">
                <div className={`flex h-20 items-end justify-end p-2 ${c.cls}`}>
                  <span className="tabular rounded-sm bg-surface px-1.5 py-0.5 text-[11px] font-semibold text-ink">{ratio.toFixed(1)}:1</span>
                </div>
                <div className="flex flex-col gap-1 p-3">
                  <span className="font-mono text-xs font-medium text-ink">{c.token}</span>
                  <span className="tabular font-mono text-xs text-ink-muted">{c.hex}</span>
                  <span className="text-xs text-ink-muted">{t(`foundations.colors.usage.${c.token.split(" ")[0].replace(/-(\w)/g, (_, x: string) => x.toUpperCase())}`)}</span>
                  <span className="mt-1 flex flex-wrap items-center gap-1">
                    {aa ? <Badge variant={ratio >= 4.5 ? "success" : "warning"}>{aa}</Badge> : <Badge>{t("foundations.colors.decorative")}</Badge>}
                    <span className="text-[11px] text-ink-muted">{c.text ? t("foundations.colors.onWhite") : t("foundations.colors.pair")}</span>
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
        <p className="text-sm text-ink-muted">{t("foundations.colors.rule")}</p>
      </Group>

      <Group title={t("foundations.type.title")} description={t("foundations.type.description")}>
        <div className="flex flex-col divide-y divide-border rounded-md border border-border">
          {[
            { k: "display", el: <p className="font-display text-4xl font-medium italic lg:text-6xl">{t("hero.tagline")}</p>, spec: "Cormorant Garamond 500 · 36/44 → 64/68" },
            { k: "h1", el: <p className="text-3xl font-semibold tracking-tight lg:text-5xl">Pointe Shoes</p>, spec: "Jakarta Sans 600 · 30/36 → 48/56 · −0.01em" },
            { k: "h2", el: <p className="text-2xl font-semibold lg:text-3xl">{t("foundations.type.sampleH2")}</p>, spec: "600 · 24/32 → 30/36" },
            { k: "h3", el: <p className="text-xl font-semibold lg:text-2xl">Claudia Satin SD09</p>, spec: "600 · 20/28 → 24/32" },
            { k: "eyebrow", el: <p className="eyebrow">Ballet · Kids</p>, spec: "12/16 · 600 · UPPERCASE · 0.12em" },
            { k: "body", el: <p className="max-w-[70ch] text-base">{t("foundations.type.sampleBody")}</p>, spec: "16/24 · 400 · max 70ch" },
            { k: "small", el: <p className="text-sm text-ink-muted">Ballet Pink · 7.5L · C</p>, spec: "14/20 · 400–500" },
            { k: "caption", el: <p className="text-xs text-ink-muted">{t("foundations.type.sampleCaption")}</p>, spec: "12/16 · ink-muted" },
            { k: "pricePdp", el: <p className="tabular text-2xl font-semibold">Rp 2.790.000</p>, spec: "24/32 · 600 · tabular-nums" },
            { k: "mono", el: <p className="tabular font-mono text-xl font-medium tracking-[0.04em]">8808 1200 0457 1234</p>, spec: "mono 20/28 · 500 · 0.04em · groups of 4" },
          ].map((r) => (
            <div key={r.k} className="grid gap-2 p-5 md:grid-cols-[180px_1fr] md:items-baseline md:gap-8">
              <div className="flex flex-col gap-0.5">
                <span className="eyebrow text-ink">{t(`foundations.type.roles.${r.k}`)}</span>
                <span className="font-mono text-[11px] text-ink-muted">{r.spec}</span>
              </div>
              <div className="min-w-0 break-words">{r.el}</div>
            </div>
          ))}
        </div>
      </Group>

      <div className="grid gap-12 lg:grid-cols-2">
        <Group title={t("foundations.spacing.title")} description={t("foundations.spacing.description")}>
          <Specimen>
            <ul className="flex flex-col gap-3">
              {[4, 8, 12, 16, 24, 32, 48, 80].map((px) => (
                <li key={px} className="grid grid-cols-[48px_1fr] items-center gap-4">
                  <span className="tabular font-mono text-xs text-ink-muted">{px}px</span>
                  <span className="h-4 bg-accent-strong" style={{ width: px * 3 }} />
                </li>
              ))}
            </ul>
            <p className="mt-5 text-xs text-ink-muted">{t("foundations.spacing.grid")}</p>
          </Specimen>
        </Group>
        <Group title={t("foundations.radius.title")} description={t("foundations.radius.description")}>
          <Specimen>
            <ul className="grid grid-cols-3 gap-4 md:grid-cols-5">
              {[
                { k: "none", cls: "rounded-none", use: t("foundations.radius.none") },
                { k: "sm · 2px", cls: "rounded-sm", use: t("foundations.radius.sm") },
                { k: "md · 4px", cls: "rounded-md", use: t("foundations.radius.md") },
                { k: "lg · 8px", cls: "rounded-lg", use: t("foundations.radius.lg") },
                { k: "pill", cls: "rounded-pill", use: t("foundations.radius.pill") },
              ].map((r) => (
                <li key={r.k} className="flex flex-col items-start gap-2">
                  <span className={`size-16 border-2 border-ink bg-surface-alt ${r.cls}`} />
                  <span className="font-mono text-xs text-ink">{r.k}</span>
                  <span className="text-xs text-ink-muted">{r.use}</span>
                </li>
              ))}
            </ul>
            <p className="mt-5 text-xs text-ink-muted">{t("foundations.radius.shadow")}</p>
          </Specimen>
        </Group>
      </div>

      <Group title={t("foundations.icons.title")} description={t("foundations.icons.description")}>
        <Specimen>
          <ul className="grid grid-cols-4 gap-x-2 gap-y-5 md:grid-cols-6 lg:grid-cols-9">
            {Object.entries(ICONS).map(([name, Icon]) => (
              <li key={name} className="flex flex-col items-center gap-2 text-center">
                <Icon size={24} strokeWidth={1.5} aria-hidden />
                <span className="w-full truncate font-mono text-[10px] text-ink-muted">{name}</span>
              </li>
            ))}
            <li className="flex flex-col items-center gap-2 text-center">
              <span className="inline-flex size-7 items-center justify-center rounded-pill bg-whatsapp text-whatsapp-ink">
                <WhatsAppIcon size={18} />
              </span>
              <span className="font-mono text-[10px] text-ink-muted">WhatsApp</span>
            </li>
          </ul>
        </Specimen>
        <div className="grid gap-4 md:grid-cols-[240px_1fr]">
          <Specimen label={t("foundations.icons.placeholder")} tone="alt" bodyClassName="flex items-center justify-center text-ink-subtle">
            <ShoePlaceholderArt className="w-40" />
          </Specimen>
          <Specimen label={t("foundations.icons.logos")} code="<LogoTile code=&quot;BCA&quot; active />">
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap gap-2">
                {["QRIS", "GOPAY", "OVO", "DANA", "SHOPEEPAY", "BCA", "MANDIRI", "BNI", "BRI", "PERMATA", "VISA", "MASTERCARD", "JCB"].map((c) => (
                  <LogoTile key={c} code={c} />
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                {["JNE", "J&T", "SiCepat", "AnterAja", "GoSend", "GrabExpress"].map((c) => (
                  <LogoTile key={c} code={c} active={false} />
                ))}
              </div>
              <p className="text-xs text-ink-muted">{t("foundations.icons.logosNote")}</p>
            </div>
          </Specimen>
        </div>
      </Group>
    </>
  );
}
