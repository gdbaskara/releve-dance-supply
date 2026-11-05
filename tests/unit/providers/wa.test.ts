import { beforeAll, describe, expect, it } from "vitest";
import { buildWaLink, buildWaLinkTo, buildWaText } from "@/lib/wa/link";
import { NOTIFICATION_TEMPLATES, renderNotification } from "@/lib/wa/templates";
import glossary from "../../../design-system/glossary.json";

beforeAll(() => {
  process.env.NEXT_PUBLIC_WA_NUMBER = "6281200000000";
});

describe("wa.me links (WA-03, docs/05 §6)", () => {
  it("pdp with variant and url", () => {
    const text = buildWaText("pdp", { name: "Diamond", modelCode: "SD140", variant: "Ballet Pink · 7.5 · M", url: "https://x/p/diamond" }, "id");
    expect(text).toBe("Halo Relevé, saya mau tanya Diamond (SD140) – Ballet Pink · 7.5 · M. https://x/p/diamond");
    const link = buildWaLink("pdp", { name: "Diamond", modelCode: "SD140" }, "en");
    expect(link.startsWith("https://wa.me/6281200000000?text=")).toBe(true);
    expect(decodeURIComponent(link.split("text=")[1])).toBe("Hi Relevé, I'd like to ask about Diamond (SD140).");
  });

  it("cart, order, soldOut, outsideJava, sizeGuide, general", () => {
    expect(buildWaText("cart", { lines: [{ name: "Diamond", variant: "Black · 7", qty: 2 }, { name: "Elsie", qty: 1 }] }, "id"))
      .toBe("Halo Relevé, saya mau tanya keranjang saya:\n- Diamond Black · 7 ×2\n- Elsie ×1");
    expect(buildWaText("order", { orderNo: "RDS-261105-AB12" }, "id")).toBe("Halo Relevé, saya mau tanya pesanan RDS-261105-AB12.");
    expect(buildWaText("soldOut", { name: "Roy", variant: "Black · 9" }, "id")).toBe("Halo Relevé, Roy Black · 9 masih bisa dipesan?");
    expect(buildWaText("soldOut", { name: "Roy" }, "id")).toBe("Halo Relevé, Roy masih bisa dipesan?");
    expect(buildWaText("outsideJava", { province: "Bali" }, "id")).toBe("Halo Relevé, saya di Bali, apakah bisa kirim ke sini?");
    expect(buildWaText("outsideJava", {}, "en")).toContain("outside Java");
    expect(buildWaText("sizeGuide", { name: "Alina IV", modelCode: "P95" }, "id")).toContain("konsultasi ukuran untuk Alina IV (P95)");
    expect(buildWaText("general", undefined, "en")).toBe("Hi Relevé, I have a question.");
  });

  it("admin → buyer link uses digits only", () => {
    expect(buildWaLinkTo("+6281234567890", "Halo kak")).toBe("https://wa.me/6281234567890?text=Halo%20kak");
  });

  it("notification templates exist in id & en and render vars", () => {
    for (const t of Object.values(NOTIFICATION_TEMPLATES)) {
      expect(t.id.length).toBeGreaterThan(10);
      expect(t.en.length).toBeGreaterThan(10);
    }
    expect(renderNotification("ORDER_SHIPPED", "id", { order_no: "RDS-1", courier: "JNE", awb: "123", track_url: "u" }))
      .toBe("Pesanan RDS-1 sudah dikirim via JNE, resi 123. Lacak: u");
  });

  it("no forbidden strings in any template", () => {
    const all = Object.values(NOTIFICATION_TEMPLATES).flatMap((t) => [t.id, t.en]).join("\n");
    for (const f of glossary.forbidden_strings) expect(all).not.toContain(f);
  });
});
