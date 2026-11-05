import type { ProductSummary } from "@/lib/contracts";
import { ColorPreviewCard } from "./color-preview-card";

/** Listing grid: 2 cols mobile · 3 tablet · 4 desktop (3 next to the filter sidebar). */
export function ProductGrid({ items, withSidebar = true }: { items: ProductSummary[]; withSidebar?: boolean }) {
  return (
    <ul
      className={
        withSidebar
          ? "grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 md:gap-x-6 xl:gap-x-8"
          : "grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 md:gap-x-6 lg:grid-cols-4 lg:gap-x-8"
      }
    >
      {items.map((p, i) => (
        <li key={p.slug} className="relative">
          <ColorPreviewCard product={p} priority={i < 2} />
        </li>
      ))}
    </ul>
  );
}
