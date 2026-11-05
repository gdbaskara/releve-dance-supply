"use client";

import * as React from "react";
import { Dialog as RDialog } from "radix-ui";
import { cn } from "@/lib/utils/cn";
import { PanelChrome, type PanelContentProps } from "./dialog";

export const Drawer = RDialog.Root;
export const DrawerTrigger = RDialog.Trigger;
export const DrawerClose = RDialog.Close;

export interface DrawerContentProps extends PanelContentProps {
  /**
   * - `right`: side panel 420px (cart on desktop)
   * - `left`: side panel (mobile nav)
   * - `bottom`: bottom drawer
   * - `responsive` (default): bottom < 768px, right ≥ 768px
   */
  side?: "right" | "left" | "bottom" | "responsive";
}

/** Drawer panel built on Radix Dialog (focus trap, Esc, scroll lock). */
export const DrawerContent = React.forwardRef<HTMLDivElement, DrawerContentProps>(function DrawerContent(
  { side = "responsive", title, description, hideTitle, footer, flush, closeLabel, className, children, ...props },
  ref,
) {
  const sideCls = {
    right: "inset-y-0 right-0 h-dvh w-full max-w-[420px] starting:translate-x-8",
    left: "inset-y-0 left-0 h-dvh w-[88%] max-w-[360px] starting:-translate-x-8",
    bottom: "inset-x-0 bottom-0 max-h-[90dvh] rounded-t-lg starting:translate-y-8",
    responsive: cn(
      "inset-x-0 bottom-0 max-h-[90dvh] rounded-t-lg starting:translate-y-8",
      "md:inset-x-auto md:inset-y-0 md:right-0 md:h-dvh md:max-h-none md:w-[420px] md:rounded-none md:starting:translate-x-8 md:starting:translate-y-0",
    ),
  }[side];
  return (
    <RDialog.Portal>
      <RDialog.Overlay className="fixed inset-0 z-50 bg-overlay transition-opacity duration-200 ease-standard starting:opacity-0" />
      <RDialog.Content
        ref={ref}
        className={cn(
          "fixed z-50 flex flex-col bg-surface shadow-overlay outline-none",
          "transition-[opacity,transform] duration-200 ease-standard starting:opacity-0",
          sideCls,
          className,
        )}
        {...props}
      >
        {side === "bottom" || side === "responsive" ? (
          <span aria-hidden className={cn("mx-auto mt-2 h-1 w-10 shrink-0 rounded-pill bg-border", side === "responsive" && "md:hidden")} />
        ) : null}
        <PanelChrome title={title} description={description} hideTitle={hideTitle} footer={footer} flush={flush} closeLabel={closeLabel}>
          {children}
        </PanelChrome>
      </RDialog.Content>
    </RDialog.Portal>
  );
});
