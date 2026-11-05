"use client";

import * as React from "react";
import { RadioGroup as RRadio, Tabs as RTabs } from "radix-ui";
import { cn } from "@/lib/utils/cn";

export interface SegmentOption {
  value: string;
  label: React.ReactNode;
  /** Not selectable at all (combination doesn't exist). */
  disabled?: boolean;
  /** Selectable but visually struck through (e.g. sold out). Sets aria-describedby text via `srHint`. */
  unavailable?: boolean;
  /** Extra screen-reader text, e.g. "Habis". */
  srHint?: string;
  /** Small marker rendered in the corner (e.g. "PO"). */
  marker?: React.ReactNode;
}

export interface SegmentedControlProps {
  options: SegmentOption[];
  value: string | null;
  onChange: (value: string) => void;
  /** Accessible name of the group. */
  label: string;
  size?: "md" | "sm";
  /** Stretch segments to fill the width. */
  fullWidth?: boolean;
  className?: string;
  name?: string;
}

/**
 * Single-choice segmented control (radiogroup semantics, arrow keys move selection).
 * Used for Width/Shank, payment group switches, ID/EN in forms.
 */
export function SegmentedControl({ options, value, onChange, label, size = "md", fullWidth, className, name }: SegmentedControlProps) {
  return (
    <RRadio.Root
      aria-label={label}
      value={value ?? ""}
      onValueChange={onChange}
      orientation="horizontal"
      name={name}
      className={cn("inline-flex flex-wrap gap-2", fullWidth && "flex w-full", className)}
    >
      {options.map((o) => (
        <RRadio.Item
          key={o.value}
          value={o.value}
          disabled={o.disabled}
          aria-label={o.srHint ? `${typeof o.label === "string" ? o.label : o.value}, ${o.srHint}` : undefined}
          className={cn(
            "relative inline-flex items-center justify-center rounded-sm border px-4 font-medium transition-colors duration-150",
            size === "md" ? "min-h-12 min-w-11 text-sm" : "min-h-9 text-xs",
            fullWidth && "flex-1",
            "border-border-strong bg-surface text-ink hover:bg-surface-alt",
            "data-[state=checked]:border-ink data-[state=checked]:bg-ink data-[state=checked]:text-ink-inverse",
            "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus",
            "disabled:cursor-not-allowed disabled:border-border disabled:text-ink-subtle disabled:hover:bg-surface",
            o.unavailable && "text-ink-subtle line-through data-[state=checked]:bg-ink-muted data-[state=checked]:border-ink-muted",
          )}
        >
          {o.label}
          {o.marker ? (
            <span className="absolute -right-1 -top-2 rounded-sm bg-warning-bg px-1 text-[10px] font-semibold leading-4 text-warning no-underline">
              {o.marker}
            </span>
          ) : null}
        </RRadio.Item>
      ))}
    </RRadio.Root>
  );
}

// Tabs

export interface TabItem {
  value: string;
  label: React.ReactNode;
  content: React.ReactNode;
  disabled?: boolean;
}

export interface TabsProps {
  items: TabItem[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (v: string) => void;
  /** Accessible name of the tablist. */
  label: string;
  className?: string;
  listClassName?: string;
  /** "underline" (default, page sections) or "pill" (compact segmented look). */
  variant?: "underline" | "pill";
}

/** Radix Tabs with token styling. Tab list scrolls horizontally on small screens. */
export function Tabs({ items, value, defaultValue, onValueChange, label, className, listClassName, variant = "underline" }: TabsProps) {
  return (
    <RTabs.Root
      value={value}
      defaultValue={defaultValue ?? items[0]?.value}
      onValueChange={onValueChange}
      className={cn("flex flex-col gap-4", className)}
    >
      <RTabs.List
        aria-label={label}
        className={cn(
          "-mx-1 flex overflow-x-auto px-1",
          variant === "underline" ? "gap-6 border-b border-border" : "gap-2",
          listClassName,
        )}
      >
        {items.map((it) => (
          <RTabs.Trigger
            key={it.value}
            value={it.value}
            disabled={it.disabled}
            className={cn(
              "eyebrow shrink-0 whitespace-nowrap transition-colors duration-150",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus",
              "disabled:opacity-40",
              variant === "underline"
                ? "-mb-px min-h-11 border-b-2 border-transparent text-ink-muted hover:text-ink data-[state=active]:border-ink data-[state=active]:text-ink"
                : "min-h-9 rounded-pill border border-border-strong px-4 text-ink hover:bg-surface-alt data-[state=active]:border-ink data-[state=active]:bg-ink data-[state=active]:text-ink-inverse",
            )}
          >
            {it.label}
          </RTabs.Trigger>
        ))}
      </RTabs.List>
      {items.map((it) => (
        <RTabs.Content key={it.value} value={it.value} className="focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus">
          {it.content}
        </RTabs.Content>
      ))}
    </RTabs.Root>
  );
}
