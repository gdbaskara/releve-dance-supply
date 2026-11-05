import { LoaderCircle } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export interface SpinnerProps {
  /** Pixel size of the icon. Default 20. */
  size?: number;
  className?: string;
  /** Accessible label. When omitted the spinner is decorative (aria-hidden). */
  label?: string;
}

/** Small rotating loader. Rotation stops under prefers-reduced-motion (icon stays visible). */
export function Spinner({ size = 20, className, label }: SpinnerProps) {
  return (
    <span
      role={label ? "status" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={cn("inline-flex shrink-0", className)}
    >
      <LoaderCircle size={size} strokeWidth={1.5} className="motion-safe:animate-spin" />
    </span>
  );
}
