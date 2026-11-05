import * as React from "react";
import { cn } from "@/lib/utils/cn";

/** Top-level showcase section (Foundations, Primitives, …). */
export function Section({
  id,
  index,
  title,
  description,
  children,
}: {
  id: string;
  index: string;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-h`} className="scroll-mt-28 border-t border-border py-12 lg:py-20">
      <header className="mb-10 flex flex-col gap-3 lg:mb-14">
        <span className="eyebrow text-accent-strong">{index}</span>
        <h2 id={`${id}-h`} className="text-3xl font-semibold tracking-tight lg:text-5xl">
          {title}
        </h2>
        {description ? <p className="max-w-[70ch] text-base text-ink-muted">{description}</p> : null}
      </header>
      <div className="flex flex-col gap-12 lg:gap-16">{children}</div>
    </section>
  );
}

/** A group of specimens with an H3. */
export function Group({ id, title, description, children }: { id?: string; title: string; description?: string; children: React.ReactNode }) {
  return (
    <div id={id} className="flex scroll-mt-28 flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h3 className="text-xl font-semibold lg:text-2xl">{title}</h3>
        {description ? <p className="max-w-[70ch] text-sm text-ink-muted">{description}</p> : null}
      </div>
      {children}
    </div>
  );
}

/** Bordered specimen frame with an UPPERCASE caption and optional code hint. */
export function Specimen({
  label,
  code,
  children,
  className,
  bodyClassName,
  tone = "plain",
}: {
  label?: string;
  code?: string;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  tone?: "plain" | "alt";
}) {
  return (
    <figure className={cn("flex min-w-0 flex-col overflow-hidden rounded-md border border-border", className)}>
      <div className={cn("min-w-0 flex-1 p-5 md:p-6", tone === "alt" && "bg-surface-alt", bodyClassName)}>{children}</div>
      {label || code ? (
        <figcaption className="flex flex-wrap items-center justify-between gap-2 border-t border-border bg-surface px-5 py-2.5">
          {label ? <span className="eyebrow text-ink-muted">{label}</span> : <span />}
          {code ? <code className="min-w-0 break-all font-mono text-xs text-ink-muted">{code}</code> : null}
        </figcaption>
      ) : null}
    </figure>
  );
}

/** Small caption above a state in a row of states. */
export function StateLabel({ children }: { children: React.ReactNode }) {
  return <span className="text-xs font-medium text-ink-muted">{children}</span>;
}

/** Phone-sized frame used in Patterns to show a mobile screen state. */
export function PhoneFrame({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <figure className="flex min-w-0 flex-col gap-2">
      <figcaption className="eyebrow text-ink-muted">{label}</figcaption>
      <div className="flex min-h-[520px] flex-col gap-4 rounded-lg border border-border bg-surface p-4 md:p-5">{children}</div>
    </figure>
  );
}
