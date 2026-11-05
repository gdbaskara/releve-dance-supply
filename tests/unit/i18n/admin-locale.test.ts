import { describe, it, expect } from "vitest";
import {
  ADMIN_LOCALES, ADMIN_LOCALE_COOKIE, DEFAULT_ADMIN_LOCALE, adminNumberLocale, isAdminLocale, parseAdminLocale,
} from "@/i18n/admin-locale";

describe("admin locale cookie (D-31)", () => {
  it("uses the admin_locale cookie with id as default", () => {
    expect(ADMIN_LOCALE_COOKIE).toBe("admin_locale");
    expect(DEFAULT_ADMIN_LOCALE).toBe("id");
    expect([...ADMIN_LOCALES]).toEqual(["id", "en"]);
  });

  it.each(["id", "en"] as const)("accepts %s", (v) => {
    expect(parseAdminLocale(v)).toBe(v);
    expect(isAdminLocale(v)).toBe(true);
  });

  it.each([undefined, null, "", "fr", "EN", " en", "en-US", "id;en", 1, ["en"], { locale: "en" }])("falls back to id for %j", (v) => {
    expect(parseAdminLocale(v)).toBe("id");
    expect(isAdminLocale(v)).toBe(false);
  });

  it("maps to an Intl tag for non-money numbers", () => {
    expect(adminNumberLocale("id")).toBe("id-ID");
    expect(adminNumberLocale("en")).toBe("en-US");
    expect((1.45).toLocaleString(adminNumberLocale("en"), { minimumFractionDigits: 2 })).toBe("1.45");
    expect((1.45).toLocaleString(adminNumberLocale("id"), { minimumFractionDigits: 2 })).toBe("1,45");
  });
});
