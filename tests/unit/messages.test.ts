import { describe, it, expect } from "vitest";
import id from "../../messages/id.json";
import en from "../../messages/en.json";
import glossary from "../../design-system/glossary.json";

function keys(obj: Record<string, unknown>, prefix = ""): string[] {
  return Object.entries(obj).flatMap(([k, v]) =>
    v && typeof v === "object" ? keys(v as Record<string, unknown>, `${prefix}${k}.`) : [`${prefix}${k}`],
  );
}
function values(obj: unknown): string[] {
  if (typeof obj === "string") return [obj];
  if (obj && typeof obj === "object") return Object.values(obj).flatMap(values);
  return [];
}

describe("i18n messages", () => {
  it("id and en have identical keys (I18N-03)", () => {
    expect(keys(en).sort()).toEqual(keys(id).sort());
  });
  it("contain no forbidden strings", () => {
    const all = [...values(id), ...values(en)].join("\n");
    for (const s of glossary.forbidden_strings) {
      // "Cicilan"/"COD" etc. must never appear as words
      expect(new RegExp(`\\b${s}\\b`).test(all), s).toBe(false);
    }
  });
});
