// @vitest-environment jsdom
import * as React from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, screen } from "@testing-library/react";
import type { ProductSummary } from "@/lib/contracts";
import { renderIntl } from "./intl";

vi.mock("next/image", () => ({
  // eslint-disable-next-line @next/next/no-img-element
  default: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} />,
}));
vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => <a href={href} {...rest}>{children}</a>,
}));

const { ColorPreviewCard } = await import("@/components/store/containers/color-preview-card");

const product: ProductSummary = {
  id: "elsie", slug: "elsie", modelCode: "SD16", name: "Elsie", brand: "So Danca", discipline: "Ballet", audience: "Adult",
  priceIdr: 450_000, colors: ["Pink", "Black", "Sand"], status: "READY",
  image: { url: "/pink.jpg", alt: "Elsie Pink", color: "Pink" },
  colorImages: { Pink: { url: "/pink.jpg", alt: "Elsie Pink", color: "Pink" }, Black: { url: "/black.jpg", alt: "Elsie Black", color: "Black" } },
};

const photo = () => screen.getByRole("img", { name: /Elsie/ }) as HTMLImageElement;
const link = () => screen.getByRole("link") as HTMLAnchorElement;

describe("ColorPreviewCard", () => {
  it("starts on the lead photo and a plain PDP link", () => {
    renderIntl(<ColorPreviewCard product={product} />);
    expect(photo().getAttribute("src")).toBe("/pink.jpg");
    expect(link().getAttribute("href")).toBe("/p/elsie");
  });
  it("hovering a swatch previews that colour and leaving restores it", () => {
    renderIntl(<ColorPreviewCard product={product} />);
    const black = screen.getByRole("button", { name: "Lihat warna Black" });
    fireEvent.mouseEnter(black);
    expect(photo().getAttribute("src")).toBe("/black.jpg");
    fireEvent.mouseLeave(black.parentElement!);
    expect(photo().getAttribute("src")).toBe("/pink.jpg");
  });
  it("clicking a swatch keeps the colour and links to the PDP in that colour", () => {
    renderIntl(<ColorPreviewCard product={product} />);
    const black = screen.getByRole("button", { name: "Lihat warna Black" });
    fireEvent.click(black);
    expect(black.getAttribute("aria-pressed")).toBe("true");
    expect(photo().getAttribute("src")).toBe("/black.jpg");
    expect(link().getAttribute("href")).toBe("/p/elsie?color=Black");
  });
  it("a colour without its own photo keeps the current photo but still sets the link", () => {
    renderIntl(<ColorPreviewCard product={product} />);
    fireEvent.click(screen.getByRole("button", { name: "Lihat warna Sand" }));
    expect(photo().getAttribute("src")).toBe("/pink.jpg");
    expect(link().getAttribute("href")).toBe("/p/elsie?color=Sand");
  });
  it("starts on the filtered colour from the listing", () => {
    renderIntl(<ColorPreviewCard product={{ ...product, matchedColor: "Black", image: product.colorImages!.Black }} />);
    expect(link().getAttribute("href")).toBe("/p/elsie?color=Black");
    expect(screen.getByRole("button", { name: "Lihat warna Black" }).getAttribute("aria-pressed")).toBe("true");
  });
  it("swatch buttons sit outside the link", () => {
    renderIntl(<ColorPreviewCard product={product} />);
    expect(link().querySelector("button")).toBeNull();
  });
});
