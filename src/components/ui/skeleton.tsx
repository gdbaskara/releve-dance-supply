import { cn } from "@/lib/utils/cn";

export interface SkeletonProps {
  /** text: lines of text · image: 1:1 block · card: ProductCard shape · block: free-form (size via className). */
  variant?: "text" | "image" | "card" | "block";
  /** Lines for `text`. Default 3. */
  lines?: number;
  className?: string;
}

const base = "rounded-sm bg-surface-alt motion-safe:animate-pulse";

/** Loading placeholder. Pulse animation is disabled under prefers-reduced-motion. aria-hidden by default. */
export function Skeleton({ variant = "block", lines = 3, className }: SkeletonProps) {
  if (variant === "text") {
    return (
      <div aria-hidden className={cn("flex flex-col gap-2", className)}>
        {Array.from({ length: lines }, (_, i) => (
          <div key={i} className={cn(base, "h-4", i === lines - 1 && lines > 1 ? "w-3/5" : "w-full")} />
        ))}
      </div>
    );
  }
  if (variant === "image") return <div aria-hidden className={cn(base, "aspect-square w-full rounded-none", className)} />;
  if (variant === "card") {
    return (
      <div aria-hidden className={cn("flex flex-col gap-3", className)}>
        <div className={cn(base, "aspect-square w-full rounded-none")} />
        <div className={cn(base, "h-3 w-1/3")} />
        <div className={cn(base, "h-4 w-4/5")} />
        <div className={cn(base, "h-4 w-2/5")} />
      </div>
    );
  }
  return <div aria-hidden className={cn(base, className)} />;
}
