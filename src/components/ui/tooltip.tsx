"use client";

import * as React from "react";
import { Popover as RPopover, Tooltip as RTooltip } from "radix-ui";
import { Info } from "lucide-react";
import { cn } from "@/lib/utils/cn";

const bubble =
  "z-50 max-w-[280px] rounded-sm bg-ink px-3 py-2 text-sm leading-5 text-ink-inverse shadow-overlay transition-opacity duration-150 starting:opacity-0";

export interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactElement;
  side?: "top" | "right" | "bottom" | "left";
  delayDuration?: number;
}

/**
 * Hover/focus tooltip for *supplementary* info only (docs/07: never essential info).
 * Does not open on touch — for glossary explanations that must work on mobile use `InfoTip`.
 */
export function Tooltip({ content, children, side = "top", delayDuration = 300 }: TooltipProps) {
  return (
    <RTooltip.Provider delayDuration={delayDuration}>
      <RTooltip.Root>
        <RTooltip.Trigger asChild>{children}</RTooltip.Trigger>
        <RTooltip.Portal>
          <RTooltip.Content side={side} sideOffset={6} className={bubble}>
            {content}
            <RTooltip.Arrow className="fill-ink" />
          </RTooltip.Content>
        </RTooltip.Portal>
      </RTooltip.Root>
    </RTooltip.Provider>
  );
}

export interface InfoTipProps {
  /** Accessible name of the trigger, e.g. "Apa itu shank?". */
  label: string;
  content: React.ReactNode;
  side?: "top" | "right" | "bottom" | "left";
  className?: string;
}

/** Tap-friendly "ⓘ" explainer (Radix Popover). 44px target; used for glossary terms (shank, width…). */
export function InfoTip({ label, content, side = "top", className }: InfoTipProps) {
  return (
    <RPopover.Root>
      <RPopover.Trigger
        aria-label={label}
        className={cn(
          "-my-3 inline-flex size-11 items-center justify-center rounded-pill text-ink-muted hover:text-ink",
          "focus-visible:outline-2 focus-visible:outline-offset-[-6px] focus-visible:outline-focus",
          className,
        )}
      >
        <Info size={16} strokeWidth={1.5} aria-hidden />
      </RPopover.Trigger>
      <RPopover.Portal>
        <RPopover.Content side={side} sideOffset={2} collisionPadding={16} className={cn(bubble, "outline-none")}>
          {content}
          <RPopover.Arrow className="fill-ink" />
        </RPopover.Content>
      </RPopover.Portal>
    </RPopover.Root>
  );
}
