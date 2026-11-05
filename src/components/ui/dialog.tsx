"use client";

import * as React from "react";
import { Dialog as RDialog } from "radix-ui";
import { useTranslations } from "next-intl";
import { X } from "lucide-react";
import { cn } from "@/lib/utils/cn";

/** Root (controlled via `open`/`onOpenChange` or uncontrolled). Focus is trapped, Esc closes. */
export const Dialog = RDialog.Root;
export const DialogTrigger = RDialog.Trigger;
export const DialogClose = RDialog.Close;

export type DialogVariant = "center" | "sheet" | "responsive";

export interface PanelContentProps extends Omit<React.ComponentPropsWithoutRef<typeof RDialog.Content>, "title"> {
  /** Required accessible title. Rendered in the header unless `hideTitle`. */
  title: React.ReactNode;
  description?: React.ReactNode;
  hideTitle?: boolean;
  /** Sticky footer area (actions). */
  footer?: React.ReactNode;
  /** Remove body padding (e.g. for edge-to-edge tables). */
  flush?: boolean;
  /** Close button label override. */
  closeLabel?: string;
}

export interface DialogContentProps extends PanelContentProps {
  /**
   * - `center`: centred modal on all sizes
   * - `sheet`: bottom sheet on all sizes
   * - `responsive` (default): bottom sheet < 768px, centred modal ≥ 768px
   */
  variant?: DialogVariant;
  size?: "sm" | "md" | "lg";
}

const overlayCls =
  "fixed inset-0 z-50 bg-overlay transition-opacity duration-200 ease-standard starting:opacity-0";

export function PanelChrome({
  title,
  description,
  hideTitle,
  footer,
  flush,
  closeLabel,
  children,
}: Pick<PanelContentProps, "title" | "description" | "hideTitle" | "footer" | "flush" | "closeLabel" | "children">) {
  const t = useTranslations("common");
  return (
    <>
      <div className={cn("flex shrink-0 items-center gap-4 border-b border-border px-5 py-3", hideTitle && "border-b-0 pb-0")}>
        <div className={cn("flex min-w-0 flex-1 flex-col justify-center gap-1 py-2.5", hideTitle && "sr-only")}>
          <RDialog.Title className="eyebrow text-ink">{title}</RDialog.Title>
          {description ? <RDialog.Description className="text-sm text-ink-muted">{description}</RDialog.Description> : null}
        </div>
        {!description ? <RDialog.Description className="sr-only">{typeof title === "string" ? title : ""}</RDialog.Description> : null}
        <RDialog.Close
          aria-label={closeLabel ?? t("close")}
          className="-mr-2 ml-auto inline-flex size-11 shrink-0 items-center justify-center rounded-sm text-ink hover:bg-surface-alt focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
        >
          <X size={20} strokeWidth={1.5} aria-hidden />
        </RDialog.Close>
      </div>
      <div className={cn("min-h-0 flex-1 overflow-y-auto overscroll-contain", !flush && "px-5 py-5")}>{children}</div>
      {footer ? (
        <div className="shrink-0 border-t border-border bg-surface px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">{footer}</div>
      ) : null}
    </>
  );
}

const sizeCls = { sm: "md:max-w-md", md: "md:max-w-xl", lg: "md:max-w-3xl" } as const;
const centerSizeCls = { sm: "max-w-md", md: "max-w-xl", lg: "max-w-3xl" } as const;

/** Modal panel. Use `variant="responsive"` (default) for "Dialog / Sheet" per docs/07 §7.1. */
export const DialogContent = React.forwardRef<HTMLDivElement, DialogContentProps>(function DialogContent(
  { title, description, hideTitle, footer, flush, closeLabel, variant = "responsive", size = "md", className, children, ...props },
  ref,
) {
  const variantCls = {
    center:
      "left-1/2 top-1/2 max-h-[min(88dvh,800px)] w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 rounded-lg starting:scale-95",
    sheet: "inset-x-0 bottom-0 max-h-[90dvh] rounded-t-lg starting:translate-y-8",
    responsive: cn(
      "inset-x-0 bottom-0 max-h-[90dvh] rounded-t-lg starting:translate-y-8",
      "md:inset-auto md:left-1/2 md:top-1/2 md:max-h-[min(88dvh,800px)] md:w-[calc(100%-4rem)] md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-lg md:starting:translate-y-0 md:starting:scale-95",
    ),
  }[variant];
  return (
    <RDialog.Portal>
      <RDialog.Overlay className={overlayCls} />
      <RDialog.Content
        ref={ref}
        className={cn(
          "fixed z-50 flex flex-col bg-surface shadow-overlay outline-none",
          "transition-[opacity,transform] duration-200 ease-standard starting:opacity-0",
          variantCls,
          variant === "responsive" && sizeCls[size],
          variant === "center" && centerSizeCls[size],
          className,
        )}
        {...props}
      >
        {variant !== "center" ? (
          <span aria-hidden className={cn("mx-auto mt-2 h-1 w-10 shrink-0 rounded-pill bg-border", variant === "responsive" && "md:hidden")} />
        ) : null}
        <PanelChrome title={title} description={description} hideTitle={hideTitle} footer={footer} flush={flush} closeLabel={closeLabel}>
          {children}
        </PanelChrome>
      </RDialog.Content>
    </RDialog.Portal>
  );
});

/** Aliases: a Sheet is a Dialog whose content uses the bottom-sheet variant. */
export const Sheet = RDialog.Root;
export const SheetTrigger = RDialog.Trigger;
export const SheetClose = RDialog.Close;
export const SheetContent = React.forwardRef<HTMLDivElement, Omit<DialogContentProps, "variant">>(function SheetContent(props, ref) {
  return <DialogContent ref={ref} variant="sheet" {...props} />;
});
