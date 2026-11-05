"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import * as React from "react";
import { useTranslations } from "next-intl";
import { BellRing, LayoutDashboard, Link2, LogOut, Menu, MessageCircle, Package, ShoppingBag } from "lucide-react";
import { logoutAction } from "@/lib/actions/admin";
import { cn } from "@/lib/utils/cn";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { AdminLocaleToggle } from "./admin-locale-toggle";

export const ADMIN_NAV = [
  { href: "/admin", labelKey: "dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/orders", labelKey: "orders", icon: ShoppingBag },
  { href: "/admin/products", labelKey: "products", icon: Package },
  { href: "/admin/checkout-links", labelKey: "checkoutLinks", icon: Link2 },
  { href: "/admin/outbox", labelKey: "outbox", icon: MessageCircle },
  { href: "/admin/back-in-stock", labelKey: "backInStock", icon: BellRing },
] as const;

function isActive(pathname: string, href: string, exact?: boolean) {
  return exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const t = useTranslations("admin.nav");
  return (
    <ul className="flex flex-col gap-0.5">
      {ADMIN_NAV.map((item) => {
        const active = isActive(pathname, item.href, "exact" in item ? item.exact : false);
        const Icon = item.icon;
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-h-11 items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus",
                active ? "bg-ink text-ink-inverse" : "text-ink hover:bg-surface-alt",
              )}
            >
              <Icon size={18} strokeWidth={1.5} aria-hidden />
              {t(item.labelKey)}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function LogoutButton() {
  const t = useTranslations("admin.nav");
  return (
    <form action={logoutAction}>
      <button
        type="submit"
        className="flex min-h-11 w-full items-center gap-3 rounded-md px-3 text-sm font-medium text-ink-muted hover:bg-surface-alt hover:text-ink focus-visible:outline-2 focus-visible:outline-focus"
      >
        <LogOut size={18} strokeWidth={1.5} aria-hidden />
        {t("logout")}
      </button>
    </form>
  );
}

/** Sidebar (≥ 1024px) + top bar with a menu drawer (< 1024px). */
export function AdminNav({ brand, adminName, adminEmail }: { brand: React.ReactNode; adminName: string; adminEmail: string }) {
  const [open, setOpen] = React.useState(false);
  const pathname = usePathname();
  const t = useTranslations("admin.nav");
  const current = ADMIN_NAV.find((i) => isActive(pathname, i.href, "exact" in i ? i.exact : false));

  const who = (
    <div className="flex flex-col px-3 text-xs">
      <span className="font-semibold text-ink">{adminName}</span>
      <span className="truncate text-ink-muted">{adminEmail}</span>
    </div>
  );

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-border bg-surface lg:flex">
        <Link href="/admin" className="flex h-[72px] items-center gap-2 border-b border-border px-5" aria-label={t("home")}>
          {brand}
        </Link>
        <nav aria-label={t("label")} className="flex-1 overflow-y-auto p-3">
          <NavLinks />
        </nav>
        <div className="flex flex-col gap-2 border-t border-border p-3">
          {who}
          <AdminLocaleToggle className="px-1.5" />
          <LogoutButton />
        </div>
      </aside>

      <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-border bg-surface px-2 lg:hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={t("openMenu")}
          aria-expanded={open}
          className="inline-flex size-11 items-center justify-center rounded-sm text-ink hover:bg-surface-alt focus-visible:outline-2 focus-visible:outline-focus"
        >
          <Menu size={22} strokeWidth={1.5} aria-hidden />
        </button>
        <Link href="/admin" className="flex items-center" aria-label={t("home")}>
          {brand}
        </Link>
        <span className="ml-auto truncate text-sm font-medium text-ink-muted">{current ? t(current.labelKey) : null}</span>
        <AdminLocaleToggle className="shrink-0" />
      </header>

      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent side="left" title={t("menuTitle")}>
          <nav aria-label={t("label")} className="flex flex-col gap-4">
            <NavLinks onNavigate={() => setOpen(false)} />
            <div className="flex flex-col gap-2 border-t border-border pt-4">
              {who}
              <LogoutButton />
            </div>
          </nav>
        </DrawerContent>
      </Drawer>
    </>
  );
}
