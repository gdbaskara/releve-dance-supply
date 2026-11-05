import { describe, it, expect } from "vitest";
import { IntlErrorCode, createTranslator, type IntlError } from "next-intl";
import { ADMIN_NAMESPACES, NAMESPACES, loadAdminMessages, loadMessages } from "../../messages";
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
function entries(obj: Record<string, unknown>, prefix = ""): [string, string][] {
  return Object.entries(obj).flatMap(([k, v]) =>
    v && typeof v === "object" ? entries(v as Record<string, unknown>, `${prefix}${k}.`) : [[`${prefix}${k}`, String(v)] as [string, string]],
  );
}

describe("i18n messages", async () => {
  const id = await loadMessages("id");
  const en = await loadMessages("en");
  it("id and en have identical keys (I18N-03)", () => {
    expect(keys(en).sort()).toEqual(keys(id).sort());
  });
  it("contain no forbidden strings", () => {
    const all = [...values(id), ...values(en)].join("\n");
    for (const s of glossary.forbidden_strings) {
      expect(new RegExp(`\\b${s}\\b`).test(all), s).toBe(false);
    }
  });
});

describe("admin i18n messages (D-31)", async () => {
  const id = await loadAdminMessages("id");
  const en = await loadAdminMessages("en");

  it("loads exactly common + admin, and admin stays out of the storefront namespaces", () => {
    expect(Object.keys(id).sort()).toEqual([...ADMIN_NAMESPACES].sort());
    expect((NAMESPACES as readonly string[]).includes("admin")).toBe(false);
  });
  it("messages/id/admin.json and messages/en/admin.json have identical keys", () => {
    expect(keys(en.admin).sort()).toEqual(keys(id.admin).sort());
  });
  it("every admin message is non-empty valid ICU in both locales", () => {
    for (const [locale, msgs] of [["id", id], ["en", en]] as const) {
      const invalid: string[] = [];
      const onError = (e: IntlError) => {
        if (e.code === IntlErrorCode.INVALID_MESSAGE) invalid.push(`${locale}: ${e.message}`);
      };
      const t = createTranslator({ locale, messages: msgs, namespace: "admin", onError });
      for (const [key, msg] of entries(msgs.admin)) {
        expect(msg.trim(), `${locale}:${key}`).not.toBe("");
        (t as unknown as (k: string) => string)(key);
      }
      expect(invalid).toEqual([]);
    }
  });
  it("contain no forbidden strings", () => {
    const all = [...values(id.admin), ...values(en.admin)].join("\n");
    for (const s of glossary.forbidden_strings) {
      expect(new RegExp(`\\b${s}\\b`).test(all), s).toBe(false);
    }
  });
});
