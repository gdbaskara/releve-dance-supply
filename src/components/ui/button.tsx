import * as React from "react";
import { Slot } from "radix-ui";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils/cn";
import { Spinner } from "./spinner";

export const buttonVariants = cva(
  [
    "relative inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-sm",
    "text-sm font-semibold uppercase tracking-button",
    "transition-colors duration-150 ease-standard",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus",
    "disabled:cursor-not-allowed disabled:opacity-40 aria-disabled:cursor-not-allowed aria-disabled:opacity-40",
    "[&_svg]:shrink-0",
  ],
  {
    variants: {
      variant: {
        primary: "bg-ink text-ink-inverse hover:bg-ink-hover active:bg-ink",
        secondary: "border border-ink bg-surface text-ink hover:bg-surface-alt active:bg-border",
        ghost: "bg-transparent text-ink hover:bg-surface-alt active:bg-border",
        whatsapp: "bg-whatsapp text-whatsapp-ink hover:brightness-95 active:brightness-90",
        danger: "bg-error text-ink-inverse hover:brightness-110 active:brightness-95",
      },
      size: {
        md: "h-12 px-6",
        sm: "h-9 px-4 text-xs",
      },
      fullWidth: { true: "w-full", false: "" },
    },
    defaultVariants: { variant: "primary", size: "md", fullWidth: false },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  /** Render the child element (e.g. a Link) with button styles instead of a <button>. */
  asChild?: boolean;
  /** Shows a spinner, keeps the label, sets aria-busy and disables the button. */
  loading?: boolean;
  /** Icon rendered before the label. */
  leadingIcon?: React.ReactNode;
  /** Icon rendered after the label. */
  trailingIcon?: React.ReactNode;
}

/**
 * Button — variants primary | secondary | ghost | whatsapp | danger; sizes md (48px) | sm (36px).
 * Rule (docs/07 §3): max one `primary` per screen/section; `whatsapp` only for WhatsApp actions.
 */
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant, size, fullWidth, asChild, loading, leadingIcon, trailingIcon, disabled, children, type, ...props },
  ref,
) {
  const classes = cn(buttonVariants({ variant, size, fullWidth }), className);
  if (asChild) {
    return (
      <Slot.Root ref={ref} className={classes} {...props}>
        {children}
      </Slot.Root>
    );
  }
  return (
    <button
      ref={ref}
      type={type ?? "button"}
      className={classes}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? <Spinner size={size === "sm" ? 16 : 18} /> : leadingIcon}
      {children}
      {!loading && trailingIcon}
    </button>
  );
});
