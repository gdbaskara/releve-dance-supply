"use client";

import * as React from "react";
import { Accordion as RAccordion } from "radix-ui";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export interface AccordionItemData {
  value: string;
  title: React.ReactNode;
  content: React.ReactNode;
  /** Optional right-side meta in the header (e.g. selected count). */
  meta?: React.ReactNode;
}

export interface AccordionProps {
  items: AccordionItemData[];
  /** "single" (one open at a time, default) or "multiple". */
  type?: "single" | "multiple";
  /** Initially open item value(s). */
  defaultOpen?: string | string[];
  className?: string;
  /** Header text style: "eyebrow" (UPPERCASE, PDP/filters) or "text" (FAQ, payment instructions). */
  headerStyle?: "eyebrow" | "text";
}

/** Radix Accordion: divider-separated rows, chevron rotates. For PDP description, FAQ, payment instructions, filters. */
export function Accordion({ items, type = "single", defaultOpen, className, headerStyle = "eyebrow" }: AccordionProps) {
  const rows = items.map((it) => (
    <RAccordion.Item key={it.value} value={it.value} className="border-b border-border">
      <RAccordion.Header asChild>
        <h3>
          <RAccordion.Trigger
            className={cn(
              "group flex min-h-14 w-full items-center justify-between gap-4 py-3 text-left text-ink",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus",
              headerStyle === "eyebrow" ? "eyebrow" : "text-base font-medium",
            )}
          >
            <span className="flex-1">{it.title}</span>
            {it.meta ? <span className="text-xs font-medium normal-case tracking-normal text-ink-muted">{it.meta}</span> : null}
            <ChevronDown
              size={20}
              strokeWidth={1.5}
              aria-hidden
              className="shrink-0 transition-transform duration-200 group-data-[state=open]:rotate-180"
            />
          </RAccordion.Trigger>
        </h3>
      </RAccordion.Header>
      <RAccordion.Content className="overflow-hidden text-base text-ink">
        <div className="pb-5">{it.content}</div>
      </RAccordion.Content>
    </RAccordion.Item>
  ));
  const cls = cn("border-t border-border", className);
  if (type === "multiple") {
    const dv = defaultOpen === undefined ? [] : Array.isArray(defaultOpen) ? defaultOpen : [defaultOpen];
    return (
      <RAccordion.Root type="multiple" defaultValue={dv} className={cls}>
        {rows}
      </RAccordion.Root>
    );
  }
  return (
    <RAccordion.Root type="single" collapsible defaultValue={Array.isArray(defaultOpen) ? defaultOpen[0] : defaultOpen} className={cls}>
      {rows}
    </RAccordion.Root>
  );
}
