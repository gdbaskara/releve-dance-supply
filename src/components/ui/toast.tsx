"use client";

import * as React from "react";
import { Toast as RToast } from "radix-ui";
import { useTranslations } from "next-intl";
import { CircleCheck, CircleExclamationPoint, Info, X } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export type ToastVariant = "success" | "error" | "info";

export interface ToastOptions {
  title: React.ReactNode;
  description?: React.ReactNode;
  variant?: ToastVariant;
  /** ms before auto-hide. Default 4000. */
  duration?: number;
  /** Optional action (e.g. "Lihat keranjang"). */
  action?: { label: string; onClick: () => void };
}

interface ToastItem extends ToastOptions {
  id: number;
  open: boolean;
}

interface ToastApi {
  toast: (opts: ToastOptions) => number;
  dismiss: (id: number) => void;
  /** Extra bottom offset (px, mobile) — set via `useToastOffset`. */
  setMobileOffset: (px: number | null) => void;
}

const ToastContext = React.createContext<ToastApi | null>(null);

const NOOP: ToastApi = { toast: () => -1, dismiss: () => {}, setMobileOffset: () => {} };

/**
 * Access the toast API. Safe outside a provider (returns a no-op), so components such as
 * CopyButton can always call it.
 */
export function useToast(): ToastApi {
  return React.useContext(ToastContext) ?? NOOP;
}

export interface ToastProviderProps {
  children: React.ReactNode;
  /**
   * Default extra bottom offset in px on mobile. Pages with a fixed bottom bar can override it at runtime
   * with `useToastOffset(px)` (StickyPayBar does). Default 0.
   */
  mobileOffset?: number;
}

const icons = { success: CircleCheck, error: CircleExclamationPoint, info: Info } as const;
const tone = { success: "text-success", error: "text-error", info: "text-info" } as const;

/**
 * Lift toasts above a fixed bottom bar while the calling component is mounted (StickyPayBar does this
 * automatically with 88px).
 */
export function useToastOffset(px: number) {
  const { setMobileOffset } = useToast();
  React.useEffect(() => {
    setMobileOffset(px);
    return () => setMobileOffset(null);
  }, [px, setMobileOffset]);
}

/** Mount once near the root (e.g. in src/app/[locale]/layout.tsx inside NextIntlClientProvider). */
export function ToastProvider({ children, mobileOffset = 0 }: ToastProviderProps) {
  const t = useTranslations("common");
  const [items, setItems] = React.useState<ToastItem[]>([]);
  const [dynamicOffset, setDynamicOffset] = React.useState<number | null>(null);
  const counter = React.useRef(0);
  const offset = dynamicOffset ?? mobileOffset;

  const api = React.useMemo<ToastApi>(
    () => ({
      toast: (opts) => {
        counter.current += 1;
        const id = counter.current;
        setItems((prev) => [...prev.slice(-2), { ...opts, id, open: true }]);
        return id;
      },
      dismiss: (id) => setItems((prev) => prev.map((x) => (x.id === id ? { ...x, open: false } : x))),
      setMobileOffset: setDynamicOffset,
    }),
    [],
  );

  return (
    <ToastContext.Provider value={api}>
      <RToast.Provider swipeDirection="down" duration={4000} label={t("toast.region")}>
        {children}
        {items.map((it) => {
          const v = it.variant ?? "info";
          const Icon = icons[v];
          return (
            <RToast.Root
              key={it.id}
              open={it.open}
              duration={it.duration}
              onOpenChange={(open) => {
                if (!open) {
                  api.dismiss(it.id);
                  setTimeout(() => setItems((prev) => prev.filter((x) => x.id !== it.id)), 250);
                }
              }}
              className={cn(
                "pointer-events-auto flex w-full items-start gap-3 rounded-md border border-border bg-surface px-4 py-3 shadow-overlay",
                "transition-[opacity,transform] duration-200 ease-standard starting:translate-y-2 starting:opacity-0",
                "data-[state=closed]:opacity-0 data-[swipe=move]:translate-y-[var(--radix-toast-swipe-move-y)]",
              )}
            >
              <Icon size={20} strokeWidth={1.5} aria-hidden className={cn("mt-0.5 shrink-0", tone[v])} />
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <RToast.Title className="text-sm font-semibold text-ink">{it.title}</RToast.Title>
                {it.description ? <RToast.Description className="text-sm text-ink-muted">{it.description}</RToast.Description> : null}
              </div>
              {it.action ? (
                <RToast.Action
                  altText={it.action.label}
                  onClick={it.action.onClick}
                  className="eyebrow min-h-11 shrink-0 px-2 text-ink underline underline-offset-4"
                >
                  {it.action.label}
                </RToast.Action>
              ) : null}
              <RToast.Close
                aria-label={t("toast.close")}
                className="-mr-2 -mt-1 inline-flex size-11 shrink-0 items-center justify-center rounded-sm text-ink-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-focus"
              >
                <X size={18} strokeWidth={1.5} aria-hidden />
              </RToast.Close>
            </RToast.Root>
          );
        })}
        <RToast.Viewport
          style={{ "--toast-mobile-offset": `${offset}px` } as React.CSSProperties}
          className={cn(
            "fixed inset-x-0 z-[60] mx-auto flex w-full max-w-[420px] flex-col gap-2 p-4 outline-none",
            "bottom-[calc(var(--toast-mobile-offset)+env(safe-area-inset-bottom))] lg:bottom-0 md:left-auto md:right-0 md:mx-0",
          )}
        />
      </RToast.Provider>
    </ToastContext.Provider>
  );
}
