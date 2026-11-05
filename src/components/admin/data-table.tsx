import Link from "next/link";
import * as React from "react";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export interface Column<T> {
  key: string;
  header: React.ReactNode;
  cell: (row: T) => React.ReactNode;
  align?: "left" | "right" | "center";
  className?: string;
  /** Allow sorting (only effective when the table gets `onSort`). */
  sortable?: boolean;
  /** Leave out of the stacked mobile card. */
  hideOnMobile?: boolean;
}

export interface DataTableProps<T> {
  rows: T[];
  columns: Column<T>[];
  rowKey: (row: T) => string;
  /** Column used as the card title on mobile (and stretched link target). Default: first column. */
  primaryKey?: string;
  rowHref?: (row: T) => string;
  /** Accessible label for the row link, e.g. "Buka order RDS-…". */
  rowLinkLabel?: (row: T) => string;
  empty?: React.ReactNode;
  caption?: string;
  sort?: { key: string; dir: "asc" | "desc" } | null;
  onSort?: (key: string) => void;
  /** Extra attributes for each row (e.g. data-testid). */
  rowProps?: (row: T) => React.HTMLAttributes<HTMLElement> & Record<`data-${string}`, string>;
}

const alignCls = { left: "text-left", right: "text-right", center: "text-center" } as const;

/**
 * Dense admin table (14px). ≥ 768px: a real table; < 768px: stacked cards (label · value).
 * Pure render — usable from Server Components; sorting works when rendered inside a Client Component with `onSort`.
 */
export function DataTable<T>({ rows, columns, rowKey, primaryKey, rowHref, rowLinkLabel, empty, caption, sort, onSort, rowProps }: DataTableProps<T>) {
  const primary = columns.find((c) => c.key === primaryKey) ?? columns[0];
  const rest = columns.filter((c) => c !== primary && !c.hideOnMobile);

  if (rows.length === 0) {
    return <div className="px-4 py-10 text-center text-sm text-ink-muted">{empty ?? "Belum ada data."}</div>;
  }

  const wrapLink = (row: T, content: React.ReactNode) =>
    rowHref ? (
      <Link
        href={rowHref(row)}
        aria-label={rowLinkLabel?.(row)}
        className="font-semibold text-ink underline-offset-4 after:absolute after:inset-0 after:content-[''] hover:underline focus-visible:outline-2 focus-visible:outline-focus"
      >
        {content}
      </Link>
    ) : (
      content
    );

  return (
    <>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full border-collapse text-sm">
          {caption ? <caption className="sr-only">{caption}</caption> : null}
          <thead>
            <tr className="border-b border-border">
              {columns.map((c) => {
                const active = sort?.key === c.key;
                const canSort = c.sortable && onSort;
                return (
                  <th
                    key={c.key}
                    scope="col"
                    aria-sort={active ? (sort!.dir === "asc" ? "ascending" : "descending") : undefined}
                    className={cn("whitespace-nowrap px-4 py-2.5 text-xs font-semibold text-ink-muted", alignCls[c.align ?? "left"], c.className)}
                  >
                    {canSort ? (
                      <button
                        type="button"
                        onClick={() => onSort!(c.key)}
                        className={cn("inline-flex items-center gap-1 hover:text-ink", active && "text-ink", c.align === "right" && "flex-row-reverse")}
                      >
                        {c.header}
                        {active ? (
                          sort!.dir === "asc" ? <ArrowUp size={14} aria-hidden /> : <ArrowDown size={14} aria-hidden />
                        ) : (
                          <ArrowUpDown size={14} aria-hidden className="opacity-50" />
                        )}
                      </button>
                    ) : (
                      c.header
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={rowKey(row)} className={cn("relative border-b border-border last:border-b-0", rowHref && "hover:bg-surface-alt")} {...rowProps?.(row)}>
                {columns.map((c) => (
                  <td key={c.key} className={cn("px-4 py-2.5 align-middle text-ink", alignCls[c.align ?? "left"], c.className)}>
                    {c === primary ? wrapLink(row, c.cell(row)) : c.cell(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="divide-y divide-border md:hidden">
        {rows.map((row) => (
          <li key={rowKey(row)} className={cn("relative flex flex-col gap-2 px-4 py-3", rowHref && "active:bg-surface-alt")} {...rowProps?.(row)}>
            <div className="text-sm">{wrapLink(row, primary.cell(row))}</div>
            {rest.length ? (
              <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-sm">
                {rest.map((c) => (
                  <div key={c.key} className="flex min-w-0 flex-col">
                    <dt className="text-xs text-ink-muted">{c.header}</dt>
                    <dd className="min-w-0 break-words text-ink">{c.cell(row)}</dd>
                  </div>
                ))}
              </dl>
            ) : null}
          </li>
        ))}
      </ul>
    </>
  );
}
