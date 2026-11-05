"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Check, ChevronDown, Search } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Field, controlBase } from "./field";

export interface ComboboxOption {
  value: string;
  label: string;
  /** Optional secondary text shown on the right (e.g. zone, count). */
  hint?: string;
  disabled?: boolean;
}

export interface ComboboxProps {
  options: ComboboxOption[];
  /** Selected value (controlled). Empty string / null = nothing selected. */
  value: string | null;
  onChange: (value: string | null) => void;
  label?: React.ReactNode;
  helper?: React.ReactNode;
  error?: React.ReactNode;
  optional?: boolean;
  placeholder?: string;
  disabled?: boolean;
  /** Custom "no results" text. Receives the query. */
  emptyText?: (query: string) => React.ReactNode;
  id?: string;
  name?: string;
  className?: string;
  /** Max visible rows before scrolling. Default 7. */
  maxVisible?: number;
}

/** Lowercase + strip diacritics and common prefixes so "jaksel" style queries match more often. */
function norm(s: string) {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

/**
 * Searchable single-select (ARIA 1.2 combobox + listbox). Built for the 119 Java cities:
 * type to filter, ↑/↓ to move, Enter to pick, Esc to close. A hidden input carries `name` for forms.
 */
export function Combobox({
  options,
  value,
  onChange,
  label,
  helper,
  error,
  optional,
  placeholder,
  disabled,
  emptyText,
  id,
  name,
  className,
  maxVisible = 7,
}: ComboboxProps) {
  const t = useTranslations("common");
  const listId = React.useId();
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [active, setActive] = React.useState(0);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const listRef = React.useRef<HTMLUListElement>(null);

  const selected = options.find((o) => o.value === value) ?? null;
  const filtered = React.useMemo(() => {
    const q = norm(query);
    if (!q) return options;
    return options.filter((o) => norm(o.label).includes(q) || norm(o.label.replace(/^(kota|kab\.)\s+/i, "")).startsWith(q));
  }, [options, query]);

  const openList = () => {
    if (disabled) return;
    setOpen(true);
    const idx = selected ? Math.max(0, options.indexOf(selected)) : 0;
    setActive(query ? 0 : idx);
  };

  const commit = (opt: ComboboxOption | undefined) => {
    if (!opt || opt.disabled) return;
    onChange(opt.value);
    setQuery("");
    setOpen(false);
  };

  React.useEffect(() => {
    if (!open || !listRef.current) return;
    const el = listRef.current.querySelector<HTMLElement>(`[data-index="${active}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [active, open]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!open) return openList();
      setActive((i) => Math.min(filtered.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(0, i - 1));
    } else if (e.key === "Enter") {
      if (open) {
        e.preventDefault();
        commit(filtered[active]);
      }
    } else if (e.key === "Escape") {
      if (open) {
        e.preventDefault();
        setOpen(false);
        setQuery("");
      }
    } else if (e.key === "Tab") {
      setOpen(false);
      setQuery("");
    }
  };

  const activeId = open && filtered[active] ? `${listId}-opt-${active}` : undefined;

  return (
    <Field label={label} helper={helper} error={error} optional={optional} id={id} className={className}>
      {(control) => (
        <div
          className="relative"
          onBlur={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
              setOpen(false);
              setQuery("");
            }
          }}
        >
          <Search
            size={18}
            strokeWidth={1.5}
            aria-hidden
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted"
          />
          <input
            ref={inputRef}
            {...control}
            type="text"
            role="combobox"
            autoComplete="off"
            aria-autocomplete="list"
            aria-expanded={open}
            aria-controls={`${listId}-list`}
            aria-activedescendant={activeId}
            disabled={disabled}
            placeholder={selected ? selected.label : (placeholder ?? t("combobox.placeholder"))}
            value={open ? query : (selected?.label ?? "")}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
              if (!open) setOpen(true);
            }}
            onFocus={openList}
            onClick={openList}
            onKeyDown={onKeyDown}
            className={cn(controlBase, "h-12 pl-10 pr-10", open && selected && "placeholder:text-ink")}
          />
          <ChevronDown
            size={20}
            strokeWidth={1.5}
            aria-hidden
            className={cn(
              "pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted transition-transform",
              open && "rotate-180",
            )}
          />
          {name ? <input type="hidden" name={name} value={value ?? ""} /> : null}
          {open ? (
            <ul
              ref={listRef}
              id={`${listId}-list`}
              role="listbox"
              aria-label={typeof label === "string" ? label : undefined}
              style={{ maxHeight: `${maxVisible * 44 + 8}px` }}
              className="absolute inset-x-0 top-full z-40 mt-1 overflow-y-auto rounded-md border border-border bg-surface py-1 shadow-overlay"
            >
              {filtered.length === 0 ? (
                <li className="px-3 py-3 text-sm text-ink-muted" role="presentation">
                  {emptyText ? emptyText(query) : t("combobox.noResults", { q: query })}
                </li>
              ) : (
                filtered.map((o, i) => {
                  const isSel = o.value === value;
                  return (
                    <li
                      key={o.value}
                      id={`${listId}-opt-${i}`}
                      data-index={i}
                      role="option"
                      aria-selected={isSel}
                      aria-disabled={o.disabled || undefined}
                      onMouseDown={(e) => e.preventDefault()}
                      onMouseEnter={() => setActive(i)}
                      onClick={() => commit(o)}
                      className={cn(
                        "flex min-h-11 cursor-pointer items-center gap-2 px-3 text-base",
                        i === active && "bg-surface-alt",
                        o.disabled && "cursor-not-allowed text-ink-subtle",
                      )}
                    >
                      <Check size={16} strokeWidth={1.5} aria-hidden className={cn("shrink-0", !isSel && "invisible")} />
                      <span className="flex-1 truncate">{o.label}</span>
                      {o.hint ? <span className="text-xs text-ink-muted">{o.hint}</span> : null}
                    </li>
                  );
                })
              )}
            </ul>
          ) : null}
        </div>
      )}
    </Field>
  );
}
