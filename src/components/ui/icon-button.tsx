import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils/cn";

export const iconButtonVariants = cva(
  [
    "relative inline-flex size-11 shrink-0 items-center justify-center rounded-sm text-ink",
    "transition-colors duration-150 ease-standard",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus",
    "disabled:cursor-not-allowed disabled:opacity-40 aria-disabled:opacity-40",
  ],
  {
    variants: {
      variant: {
        ghost: "hover:bg-surface-alt active:bg-border",
        outline: "border border-border-strong bg-surface hover:bg-surface-alt active:bg-border",
      },
    },
    defaultVariants: { variant: "ghost" },
  },
);

export interface IconButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof iconButtonVariants> {
  /** Required accessible name (the button has no visible text). */
  label: string;
  /** Optional small count badge (e.g. cart items). Hidden when 0/undefined. */
  badge?: number;
}

/** 44×44 icon-only button. Pass a lucide icon as children (size 20/24, strokeWidth 1.5). */
export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { className, variant, label, badge, children, type, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type ?? "button"}
      aria-label={label}
      title={label}
      className={cn(iconButtonVariants({ variant }), className)}
      {...props}
    >
      {children}
      {badge ? (
        <span
          aria-hidden
          className="tabular absolute right-0.5 top-0.5 inline-flex min-w-[18px] items-center justify-center rounded-pill bg-ink px-1 text-[11px] font-semibold leading-[18px] text-ink-inverse"
        >
          {badge > 99 ? "99+" : badge}
        </span>
      ) : null}
    </button>
  );
});
