import { describe, it, expect } from "vitest";
import { checkoutLinkShareText, orderChatText } from "@/lib/wa";

describe("admin -> buyer WA texts", () => {
  it("order chat follows the order language", () => {
    expect(orderChatText("id", { name: "Sari", orderNo: "RDS-1" })).toBe("Halo Sari, kami dari Relevé Dance Supply terkait pesanan RDS-1.");
    expect(orderChatText("en", { name: "Sari", orderNo: "RDS-1" })).toBe("Hi Sari, this is Relevé Dance Supply about your order RDS-1.");
  });

  it("checkout link text with and without a name", () => {
    const url = "http://shop.test/id/c/abc";
    expect(checkoutLinkShareText("id", { name: " Sari ", url })).toBe(
      `Halo Sari, ini link checkout pesanan kamu dari Relevé Dance Supply (berlaku 48 jam): ${url}`,
    );
    expect(checkoutLinkShareText("id", { url })).toBe(`Halo, ini link checkout pesanan kamu dari Relevé Dance Supply (berlaku 48 jam): ${url}`);
    expect(checkoutLinkShareText("en", { name: "", url })).toBe(`Hi, here is your checkout link from Relevé Dance Supply (valid for 48 hours): ${url}`);
  });
});
