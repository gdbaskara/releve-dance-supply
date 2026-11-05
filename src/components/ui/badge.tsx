import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils/cn";

export const badgeVariants = cva(
  "inline-flex items-center gap-1 whitespace-nowrap rounded-sm px-2 py-1 text-xs font-semibold uppercase leading-4 tracking-button",
  {
    variants: {
      variant: {
        neutral: "bg-surface-alt text-ink-muted",
        success: "bg-success-bg text-success",
        warning: "bg-warning-bg text-warning",
        error: "bg-error-bg text-error",
        info: "bg-info-bg text-info",
        accent: "bg-accent text-accent-ink",
        solid: "bg-ink text-ink-inverse",
        outline: "border border-border-strong bg-surface text-ink",
      },
    },
    defaultVariants: { variant: "neutral" },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

/** Status label: neutral | success | warning | error | info | accent (+ solid, outline). 12px 600 UPPERCASE. */
export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
