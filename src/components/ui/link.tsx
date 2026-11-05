import * as React from "react";
import { Slot } from "radix-ui";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils/cn";

/**
 * Link styles. Use with next-intl's Link: `<Link href="/c/ballet" className={linkStyles()}>`.
 * - inline: underline 1px offset 3px, hover → accent-strong
 * - nav: UPPERCASE eyebrow, underline on hover
 * - subtle: muted meta link
 */
export const linkStyles = cva(
  "rounded-sm transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus",
  {
    variants: {
      variant: {
        inline: "text-ink underline decoration-1 underline-offset-[3px] hover:text-accent-strong",
        nav: "eyebrow text-ink no-underline decoration-1 underline-offset-[6px] hover:underline",
        subtle: "text-sm text-ink-muted underline-offset-[3px] hover:text-ink hover:underline",
      },
    },
    defaultVariants: { variant: "inline" },
  },
);

export interface TextLinkProps
  extends React.AnchorHTMLAttributes<HTMLAnchorElement>,
    VariantProps<typeof linkStyles> {
  /** Render the child (e.g. next-intl `<Link>`) with these styles. */
  asChild?: boolean;
}

/** Styled anchor. For internal routes prefer `asChild` around next-intl `Link`. */
export const TextLink = React.forwardRef<HTMLAnchorElement, TextLinkProps>(function TextLink(
  { className, variant, asChild, ...props },
  ref,
) {
  const Comp = asChild ? Slot.Root : "a";
  return <Comp ref={ref} className={cn(linkStyles({ variant }), className)} {...props} />;
});
