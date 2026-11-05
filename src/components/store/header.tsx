"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Menu, Search, ShoppingBag } from "lucide-react";
import { IconButton } from "@/components/ui/icon-button";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { cn } from "@/lib/utils/cn";
import { Wordmark } from "./wordmark";

export interface NavItem {
  label: string;
  href: string;
  active?: boolean;
}

export interface HeaderProps {
  /** Desktop centre nav / mobile drawer items: SHOES · POINTE · DANCEWEAR · KIDS · TRACK ORDER. */
  navItems: NavItem[];
  /** Home link target. Default "/". */
  homeHref?: string;
  cartCount?: number;
  /** Cart button behaviour: callback (opens CartDrawer) or link (/cart). */
  onCartClick?: () => void;
  cartHref?: string;
  onSearchClick?: () => void;
  searchHref?: string;
  /** Slot for `<LanguageToggle/>` (desktop right + mobile drawer footer). */
  languageToggle?: React.ReactNode;
  /** Extra content at the bottom of the mobile menu (e.g. WA link). */
  mobileMenuFooter?: React.ReactNode;
  /** Link component (next-intl `Link`). Default "a". */
  linkAs?: React.ElementType;
  /** Slot rendered above the header bar (e.g. DemoBanner). */
  topSlot?: React.ReactNode;
  className?: string;
}

/**
 * Presentational sticky header: 56px mobile (hamburger · wordmark centre · search + cart) /
 * 72px desktop (wordmark · nav · search, language, cart). Bottom border appears after scrolling.
 */
export function Header({
  navItems,
  homeHref = "/",
  cartCount = 0,
  onCartClick,
  cartHref,
  onSearchClick,
  searchHref,
  languageToggle,
  mobileMenuFooter,
  linkAs: LinkComp = "a",
  topSlot,
  className,
}: HeaderProps) {
  const t = useTranslations("common");
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [scrolled, setScrolled] = React.useState(false);

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const cartLabel = t("header.cartCount", { n: cartCount });
  const cartIcon = <ShoppingBag size={24} strokeWidth={1.5} aria-hidden />;
  const cartBtn = cartHref ? (
    <LinkComp
      href={cartHref}
      aria-label={cartLabel}
      className="relative inline-flex size-11 items-center justify-center rounded-sm text-ink hover:bg-surface-alt focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
    >
      {cartIcon}
      {cartCount ? (
        <span aria-hidden className="tabular absolute right-0.5 top-0.5 inline-flex min-w-[18px] items-center justify-center rounded-pill bg-ink px-1 text-[11px] font-semibold leading-[18px] text-ink-inverse">
          {cartCount > 99 ? "99+" : cartCount}
        </span>
      ) : null}
    </LinkComp>
  ) : (
    <IconButton label={cartLabel} badge={cartCount} onClick={onCartClick}>
      {cartIcon}
    </IconButton>
  );
  const searchBtn = searchHref ? (
    <LinkComp
      href={searchHref}
      aria-label={t("header.search")}
      className="inline-flex size-11 items-center justify-center rounded-sm text-ink hover:bg-surface-alt focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
    >
      <Search size={24} strokeWidth={1.5} aria-hidden />
    </LinkComp>
  ) : (
    <IconButton label={t("header.search")} onClick={onSearchClick}>
      <Search size={24} strokeWidth={1.5} aria-hidden />
    </IconButton>
  );

  return (
    <header className={cn("sticky top-0 z-30 bg-surface", className)}>
      {topSlot}
      <div className={cn("border-b transition-colors duration-150", scrolled ? "border-border" : "border-transparent")}>
        <div className="container-page grid h-14 grid-cols-[1fr_auto_1fr] items-center lg:h-[72px] lg:grid-cols-[auto_1fr_auto] lg:gap-8">
          <div className="flex items-center lg:hidden">
            <IconButton label={t("header.openMenu")} onClick={() => setMenuOpen(true)} aria-expanded={menuOpen}>
              <Menu size={24} strokeWidth={1.5} aria-hidden />
            </IconButton>
          </div>
          <LinkComp
            href={homeHref}
            aria-label={t("header.home")}
            className="justify-self-center rounded-sm py-1 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus lg:justify-self-start"
          >
            <Wordmark size="sm" className="lg:hidden" />
            <Wordmark size="md" className="hidden lg:inline-flex" />
          </LinkComp>
          <nav aria-label={t("header.nav")} className="hidden justify-center lg:flex">
            <ul className="flex items-center gap-8">
              {navItems.map((n) => (
                <li key={n.href}>
                  <LinkComp
                    href={n.href}
                    aria-current={n.active ? "page" : undefined}
                    className={cn(
                      "eyebrow inline-flex min-h-11 items-center rounded-sm text-ink decoration-1 underline-offset-[8px] hover:underline",
                      "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus",
                      n.active && "underline",
                    )}
                  >
                    {n.label}
                  </LinkComp>
                </li>
              ))}
            </ul>
          </nav>
          <div className="flex items-center justify-end gap-0 lg:gap-2">
            {searchBtn}
            {languageToggle ? <div className="hidden lg:block">{languageToggle}</div> : null}
            {cartBtn}
          </div>
        </div>
      </div>
      <Drawer open={menuOpen} onOpenChange={setMenuOpen}>
        <DrawerContent side="left" title={t("menu")} closeLabel={t("header.closeMenu")}>
          <nav aria-label={t("header.nav")} className="flex h-full flex-col gap-6">
            <ul className="flex flex-col">
              {navItems.map((n) => (
                <li key={n.href} className="border-b border-border">
                  <LinkComp
                    href={n.href}
                    onClick={() => setMenuOpen(false)}
                    aria-current={n.active ? "page" : undefined}
                    className="eyebrow flex min-h-14 items-center text-sm text-ink focus-visible:outline-2 focus-visible:outline-focus"
                  >
                    {n.label}
                  </LinkComp>
                </li>
              ))}
            </ul>
            {languageToggle ? <div>{languageToggle}</div> : null}
            {mobileMenuFooter}
          </nav>
        </DrawerContent>
      </Drawer>
    </header>
  );
}
