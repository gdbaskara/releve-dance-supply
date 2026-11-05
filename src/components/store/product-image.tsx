"use client";

import * as React from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils/cn";

/** Line-art shoe silhouette (same drawing as /public/icons/product-placeholder.svg). Colour = currentColor. */
export function ShoePlaceholderArt({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 120" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden className={className}>
      <path d="M22 84c0-11 11-18 29-20l42-4c25-3 46-8 66-2 16 5 24 13 23 23-1 8-10 12-24 12H40c-11 0-18-3-18-9Z" />
      <path d="M51 64c19 9 52 9 77-5" />
      <path d="M28 93h150" />
      <path d="M94 66c3 5 13 5 17-1" />
      <path d="M103 67l-6 12M103 67l7 11" />
      <path d="M150 58c4 6 6 13 5 20" opacity={0.6} />
    </svg>
  );
}

export interface ProductImageProps {
  /** Image URL or null → placeholder. */
  src: string | null | undefined;
  alt: string;
  /** Model code shown in the placeholder corner (e.g. "SD16"). */
  modelCode?: string;
  /** Second image shown on hover (desktop, pointer devices only). */
  hoverSrc?: string | null;
  /** next/image `sizes`. Default suits a 2/3/4-column grid. */
  sizes?: string;
  priority?: boolean;
  /** Aspect ratio class. Default 1:1. */
  aspectClassName?: string;
  className?: string;
}

/** Square product image (radius 0) with `surface-alt` placeholder fallback on null/error. */
export function ProductImage({
  src,
  alt,
  modelCode,
  hoverSrc,
  sizes = "(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw",
  priority,
  aspectClassName = "aspect-square",
  className,
}: ProductImageProps) {
  const t = useTranslations("common");
  const [failed, setFailed] = React.useState(false);
  const [hoverFailed, setHoverFailed] = React.useState(false);
  const showImg = Boolean(src) && !failed;
  return (
    <div className={cn("group/img relative w-full overflow-hidden bg-surface-alt", aspectClassName, className)}>
      {showImg ? (
        <>
          <Image
            src={src as string}
            alt={alt}
            fill
            sizes={sizes}
            priority={priority}
            onError={() => setFailed(true)}
            className="object-cover"
          />
          {hoverSrc && !hoverFailed ? (
            <Image
              src={hoverSrc}
              alt=""
              fill
              sizes={sizes}
              onError={() => setHoverFailed(true)}
              className="object-cover opacity-0 transition-opacity duration-300 [@media(hover:hover)]:group-hover/img:opacity-100"
            />
          ) : null}
        </>
      ) : (
        <div role="img" aria-label={alt} className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-ink-subtle">
          <ShoePlaceholderArt className="w-3/5 max-w-[220px]" />
          <span className="sr-only">{t("product.placeholder")}</span>
          {modelCode ? (
            <span aria-hidden className="eyebrow absolute bottom-3 left-3 text-ink-subtle">
              {modelCode}
            </span>
          ) : null}
        </div>
      )}
    </div>
  );
}
