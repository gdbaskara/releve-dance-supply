"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import * as React from "react";
import { BellRing, LayoutDashboard, Link2, LogOut, Menu, MessageCircle, Package, ShoppingBag } from "lucide-react";
import { logoutAction } from "@/lib/actions/admin";
import { cn } from "@/lib/utils/cn";
import { Drawer, DrawerContent } from "@/components/ui/drawer";

export const ADMIN_NAV = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/orders", label: "Order", icon: ShoppingBag },
  { href: "/admin/products", label: "Produk & stok", icon: Package },
  { href: "/admin/checkout-links", label: "Checkout link", icon: Link2 },
  { href: "/admin/outbox", label: "WA outbox", icon: MessageCircle },
  { href: "/admin/back-in-stock", label: "Back-in-stock", icon: BellRing },
] as const;

function isActive(pathname: string, href: string, exact?: boolean) {
  return exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
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
              {item.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function LogoutButton() {
  return (
    <form action={logoutAction}>
      <button
        type="submit"
        className="flex min-h-11 w-full items-center gap-3 rounded-md px-3 text-sm font-medium text-ink-muted hover:bg-surface-alt hover:text-ink focus-visible:outline-2 focus-visible:outline-focus"
      >
        <LogOut size={18} strokeWidth={1.5} aria-hidden />
        Keluar
      </button>
    </form>
  );
}

/** Sidebar (≥ 1024px) + top bar with a menu drawer (< 1024px). */
export function AdminNav({ brand, adminName, adminEmail }: { brand: React.ReactNode; adminName: string; adminEmail: string }) {
  const [open, setOpen] = React.useState(false);
  const pathname = usePathname();
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
        <Link href="/admin" className="flex h-[72px] items-center gap-2 border-b border-border px-5" aria-label="Dashboard admin">
          {brand}
        </Link>
        <nav aria-label="Navigasi admin" className="flex-1 overflow-y-auto p-3">
          <NavLinks />
        </nav>
        <div className="flex flex-col gap-2 border-t border-border p-3">
          {who}
          <LogoutButton />
        </div>
      </aside>

      <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-border bg-surface px-2 lg:hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Buka menu"
          aria-expanded={open}
          className="inline-flex size-11 items-center justify-center rounded-sm text-ink hover:bg-surface-alt focus-visible:outline-2 focus-visible:outline-focus"
        >
          <Menu size={22} strokeWidth={1.5} aria-hidden />
        </button>
        <Link href="/admin" className="flex items-center" aria-label="Dashboard admin">
          {brand}
        </Link>
        <span className="ml-auto truncate pr-2 text-sm font-medium text-ink-muted">{current?.label}</span>
      </header>

      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent side="left" title="Menu admin">
          <nav aria-label="Navigasi admin" className="flex flex-col gap-4">
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
