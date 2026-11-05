"use client";
/**
 * Store chrome header (CAT-01, I18N-02): sticky Header + desktop mega menu for SHOES + cart count
 * (opens the CartDrawer) + locale toggle that keeps the current page.
 */
import * as React from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { Header, type NavItem } from "@/components/store/header";
import { WhatsAppButton } from "@/components/store/whatsapp-button";
import { useCart, cartCount } from "@/lib/cart/store";
import { buildWaLink } from "@/lib/wa";
import { COLLECTIONS, type Locale } from "@/lib/contracts";
import { cn } from "@/lib/utils/cn";
import { LocaleSwitch } from "./locale-switch";
import { useHydrated } from "./use-validated-cart";
import { disciplineSlug } from "./format";

const NAV = [
  { key: "shoes", href: "/c/shoes" },
  { key: "pointe", href: "/c/pointe" },
  { key: "dancewear", href: "/c/dancewear" },
  { key: "kids", href: "/c/kids" },
  { key: "track", href: "/track" },
] as const;

function isActive(pathname: string, href: string): boolean {
  if (href === "/c/shoes") {
    const shoeSlugs = COLLECTIONS.shoes.filter((d) => d !== "Pointe").map((d) => `/c/${disciplineSlug(d)}`);
    return pathname === href || shoeSlugs.includes(pathname);
  }
  if (href === "/c/dancewear") {
    return pathname === href || COLLECTIONS.dancewear.some((d) => pathname === `/c/${disciplineSlug(d)}`);
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

function MegaMenu({ onNavigate, waHref }: { onNavigate: () => void; waHref: string }) {
  const t = useTranslations("nav.mega");
  const tc = useTranslations("catalog.collections");
  const linkCls =
    "inline-flex min-h-9 items-center rounded-sm text-sm text-ink-muted hover:text-ink hover:underline focus-visible:outline-2 focus-visible:outline-focus";
  const kids = [
    { label: t("kidsAll"), href: "/c/kids" },
    { label: t("kidsBallet"), href: "/c/kids?discipline=Ballet" },
    { label: t("kidsTap"), href: "/c/kids?discipline=Tap" },
    { label: t("kidsDancewear"), href: "/c/kids?discipline=Tops" },
  ];
  return (
    <div className="container-page grid grid-cols-[1fr_1fr_minmax(0,1.2fr)] gap-10 py-8">
      <div className="flex flex-col gap-3">
        <p className="eyebrow text-ink">{t("disciplines")}</p>
        <ul className="grid grid-cols-2 gap-x-6">
          {COLLECTIONS.shoes.map((d) => {
            const slug = disciplineSlug(d);
            return (
              <li key={d}>
                <Link href={`/c/${slug}`} onClick={onNavigate} className={linkCls}>
                  {tc(`${slug}.title` as "ballet.title")}
                </Link>
              </li>
            );
          })}
          <li>
            <Link href="/c/shoes" onClick={onNavigate} className={cn(linkCls, "font-semibold text-ink")}>
              {t("allShoes")}
            </Link>
          </li>
        </ul>
      </div>
      <div className="flex flex-col gap-3">
        <p className="eyebrow text-ink">{t("kids")}</p>
        <ul>
          {kids.map((k) => (
            <li key={k.href}>
              <Link href={k.href} onClick={onNavigate} className={linkCls}>
                {k.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
      <div className="flex flex-col justify-between gap-4 rounded-md bg-accent p-6">
        <div className="flex flex-col gap-2">
          <p className="eyebrow text-accent-ink">{t("consultTitle")}</p>
          <p className="font-display text-2xl italic leading-8 text-ink">{t("consultBody")}</p>
        </div>
        <WhatsAppButton href={waHref} variant="inline" size="sm" label={t("consultCta")} className="self-start" />
      </div>
    </div>
  );
}

export function StoreHeader() {
  const t = useTranslations("nav");
  const locale = useLocale() as Locale;
  const pathname = usePathname();
  const hydrated = useHydrated();
  const items = useCart((s) => s.items);
  const openDrawer = useCart((s) => s.openDrawer);
  const [megaOpen, setMegaOpen] = React.useState(false);
  const wrapRef = React.useRef<HTMLDivElement>(null);
  const closeTimer = React.useRef<number | null>(null);

  const navItems: NavItem[] = NAV.map((n) => ({ label: t(`items.${n.key}`), href: n.href, active: isActive(pathname, n.href) }));
  const waGeneral = buildWaLink("general", undefined, locale);

  const isShoesLink = (el: EventTarget | null) => {
    const a = el instanceof Element ? el.closest("nav a") : null;
    return !!a && /\/c\/shoes$/.test(a.getAttribute("href") ?? "");
  };
  const isOtherNavLink = (el: EventTarget | null) => {
    const a = el instanceof Element ? el.closest("nav a") : null;
    return !!a && !/\/c\/shoes$/.test(a.getAttribute("href") ?? "");
  };
  const cancelClose = () => {
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
    closeTimer.current = null;
  };

  React.useEffect(() => {
    if (!megaOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMegaOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [megaOpen]);

  return (
    <div
      ref={wrapRef}
      className="sticky top-0 z-30"
      onPointerOver={(e) => {
        if (e.pointerType !== "mouse") return;
        if (isShoesLink(e.target)) {
          cancelClose();
          setMegaOpen(true);
        } else if (isOtherNavLink(e.target)) setMegaOpen(false);
      }}
      onPointerLeave={() => {
        cancelClose();
        closeTimer.current = window.setTimeout(() => setMegaOpen(false), 120);
      }}
      onPointerEnter={cancelClose}
      onFocus={(e) => {
        if (isShoesLink(e.target)) setMegaOpen(true);
        else if (isOtherNavLink(e.target)) setMegaOpen(false);
      }}
      onBlur={(e) => {
        if (!wrapRef.current?.contains(e.relatedTarget as Node | null)) setMegaOpen(false);
      }}
    >
      <Header
        className="static"
        navItems={navItems}
        homeHref="/"
        linkAs={Link}
        cartCount={hydrated ? cartCount(items) : 0}
        onCartClick={openDrawer}
        searchHref="/search"
        languageToggle={<LocaleSwitch />}
        mobileMenuFooter={
          <div className="flex flex-col gap-2 border-t border-border pt-4">
            <Link href="/size-guide" className="inline-flex min-h-11 items-center text-sm text-ink underline underline-offset-[3px]">
              {t("footer.sizeGuide")}
            </Link>
            <WhatsAppButton href={waGeneral} variant="link" label={t("footer.waChat")} />
          </div>
        }
      />
      {megaOpen ? (
        <div className="absolute inset-x-0 top-full hidden border-y border-border bg-surface shadow-overlay lg:block">
          <MegaMenu onNavigate={() => setMegaOpen(false)} waHref={buildWaLink("general", undefined, locale)} />
        </div>
      ) : null}
    </div>
  );
}
