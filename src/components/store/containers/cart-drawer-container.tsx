"use client";
/** CART-01/02/03/06: CartDrawer wired to the shared store; re-validates stock each time it opens. */
import * as React from "react";
import { Link, usePathname } from "@/i18n/navigation";
import { CartDrawer } from "@/components/store/cart-drawer";
import { useCart } from "@/lib/cart/store";
import { useValidatedCart } from "./use-validated-cart";

export function CartDrawerContainer() {
  const open = useCart((s) => s.drawerOpen);
  const openDrawer = useCart((s) => s.openDrawer);
  const closeDrawer = useCart((s) => s.closeDrawer);
  const pathname = usePathname();
  const cart = useValidatedCart(open);

  // Close when navigating (Checkout / product links inside the drawer).
  const lastPath = React.useRef(pathname);
  React.useEffect(() => {
    if (lastPath.current !== pathname) {
      lastPath.current = pathname;
      closeDrawer();
    }
  }, [pathname, closeDrawer]);

  return (
    <CartDrawer
      open={open}
      onOpenChange={(o) => (o ? openDrawer() : closeDrawer())}
      lines={cart.lines}
      subtotalIdr={cart.subtotalIdr}
      notices={cart.notices.map((n) => ({ tone: n.tone, message: n.message }))}
      onQtyChange={cart.setQty}
      onRemove={cart.remove}
      checkoutHref="/checkout"
      waHref={cart.lines.length ? cart.waHref : undefined}
      lineHref={(l) => `/p/${l.productSlug}`}
      linkAs={Link}
    />
  );
}
