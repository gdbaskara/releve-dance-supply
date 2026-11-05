// @vitest-environment jsdom
import * as React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import idCommon from "../../../messages/id/common.json";
import enCommon from "../../../messages/en/common.json";
import idAdmin from "../../../messages/id/admin.json";
import enAdmin from "../../../messages/en/admin.json";

vi.mock("@/lib/actions/admin-locale", () => ({ setAdminLocaleAction: vi.fn() }));

const { AdminLocaleToggle } = await import("@/components/admin/admin-locale-toggle");
const { OrderStatusBadge } = await import("@/components/admin/status-badge");
const { Pagination } = await import("@/components/admin/pagination");

afterEach(() => cleanup());

function renderAdmin(ui: React.ReactElement, locale: "id" | "en") {
  const messages = locale === "id" ? { common: idCommon, admin: idAdmin } : { common: enCommon, admin: enAdmin };
  return render(
    <NextIntlClientProvider locale={locale} messages={messages} timeZone="Asia/Jakarta">
      {ui}
    </NextIntlClientProvider>,
  );
}

describe("AdminLocaleToggle", () => {
  it.each(["id", "en"] as const)("marks %s as current, the other not", (locale) => {
    renderAdmin(<AdminLocaleToggle />, locale);
    const other = locale === "id" ? "en" : "id";
    expect(screen.getByTestId(`admin-locale-${locale}`)).toHaveAttribute("aria-current", "true");
    expect(screen.getByTestId(`admin-locale-${other}`)).not.toHaveAttribute("aria-current");
  });

  it("is a group of keyboard-reachable submit buttons carrying the locale value", () => {
    renderAdmin(<AdminLocaleToggle />, "en");
    expect(screen.getByRole("group", { name: "Admin panel language" })).toBeInTheDocument();
    const id = screen.getByRole("button", { name: "Bahasa Indonesia" });
    expect(id).toHaveAttribute("type", "submit");
    expect(id).toHaveAttribute("name", "locale");
    expect(id).toHaveAttribute("value", "id");
    expect(id).not.toBeDisabled();
    expect(id).toHaveTextContent("ID");
  });
});

describe("admin labels follow the active locale", () => {
  it("order status badge", () => {
    renderAdmin(<OrderStatusBadge status="PENDING_PAYMENT" />, "id");
    expect(screen.getByText("Menunggu bayar")).toBeInTheDocument();
    cleanup();
    renderAdmin(<OrderStatusBadge status="PENDING_PAYMENT" />, "en");
    expect(screen.getByText("Awaiting payment")).toBeInTheDocument();
  });

  it("pagination range and labels", () => {
    renderAdmin(<Pagination page={2} pageSize={25} total={60} hrefFor={(p) => `?page=${p}`} />, "en");
    expect(screen.getByRole("navigation", { name: "Pages" })).toHaveTextContent("26–50 of 60");
    expect(screen.getByRole("link", { name: "Previous page" })).toHaveAttribute("href", "?page=1");
  });
});
