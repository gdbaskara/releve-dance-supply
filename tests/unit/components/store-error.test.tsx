// @vitest-environment jsdom
import * as React from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, screen } from "@testing-library/react";
import { renderIntl } from "./intl";

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => <a href={href} {...rest}>{children}</a>,
}));

const { default: StoreError } = await import("@/app/[locale]/(store)/error");

describe("store error page (R-27)", () => {
  it("explains the failure in the shopper's language and offers retry, home and WhatsApp", () => {
    const reset = vi.fn();
    renderIntl(<StoreError error={new Error("db down")} reset={reset} />);
    expect(screen.getByRole("heading", { name: "Halaman gagal dimuat" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Coba lagi" }));
    expect(reset).toHaveBeenCalledOnce();
    expect(screen.getByRole("link", { name: "Kembali ke beranda" }).getAttribute("href")).toBe("/");
    expect(screen.getByRole("link", { name: /WhatsApp/ }).getAttribute("href")).toMatch(/^https:\/\/wa\.me\//);
  });
  it("never shows the raw error message", () => {
    renderIntl(<StoreError error={new Error("db down")} reset={() => {}} />, "en");
    expect(screen.queryByText(/db down/)).toBeNull();
    expect(screen.getByRole("heading", { name: "This page could not load" })).toBeTruthy();
  });
});
