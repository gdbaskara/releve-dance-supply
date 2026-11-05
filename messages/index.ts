/**
 * Messages are split per namespace so parallel workstreams never edit the same file.
 * Owner per namespace: docs/09-work-plan.md. Add a namespace = add a file in BOTH id/ and en/ + list it here.
 */
export const NAMESPACES = [
  "common", "nav", "catalog", "pdp", "cart", "checkout", "pay", "order", "wa", "info", "designSystem",
] as const;

/**
 * Namespaces loaded by the /admin tree (outside [locale]). `admin` is deliberately not in NAMESPACES:
 * the storefront never needs it. `common` is shared with the UI primitives (field, toast, dialog, copy...).
 */
export const ADMIN_NAMESPACES = ["common", "admin"] as const;

type MessageLocale = "id" | "en";

async function loadNamespaces(locale: MessageLocale, namespaces: readonly string[]) {
  const entries = await Promise.all(
    namespaces.map(async (ns) => [ns, (await import(`./${locale}/${ns}.json`)).default] as const),
  );
  return Object.fromEntries(entries);
}

export async function loadMessages(locale: MessageLocale) {
  return loadNamespaces(locale, NAMESPACES);
}

export async function loadAdminMessages(locale: MessageLocale) {
  return loadNamespaces(locale, ADMIN_NAMESPACES);
}
