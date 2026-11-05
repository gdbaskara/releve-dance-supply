import { describe, it, expect } from "vitest";
import { formatIDR, normalizePhoneID, formatPhoneID, maskPhoneID, formatDateWIB } from "@/lib/format";

describe("formatIDR", () => {
  it("formats with dot separators", () => {
    expect(formatIDR(675000)).toBe("Rp 675.000");
    expect(formatIDR(1250000)).toBe("Rp 1.250.000");
    expect(formatIDR(0)).toBe("Rp 0");
  });
});

describe("normalizePhoneID", () => {
  it.each(["0812-3456-7890", "62812 3456 7890", "+62 812-3456-7890", "81234567890"])("%s", (v) => {
    expect(normalizePhoneID(v)).toBe("+6281234567890");
  });
  it("rejects invalid", () => {
    expect(normalizePhoneID("021123456")).toBeNull();
    expect(normalizePhoneID("0812")).toBeNull();
    expect(normalizePhoneID("08123456789012345")).toBeNull();
  });
  it("formats & masks", () => {
    expect(formatPhoneID("+6281234567890")).toBe("+62 812-3456-7890");
    expect(maskPhoneID("+6281234567890")).toBe("+62 812-•••-7890");
  });
});

describe("formatDateWIB", () => {
  it("uses Jakarta time", () => {
    expect(formatDateWIB(new Date("2026-11-04T18:00:00Z"), "id")).toBe("5 Nov 2026");
  });
});
