/**
 * Messages are split per namespace so parallel workstreams never edit the same file.
 * Owner per namespace: docs/09-work-plan.md. Add a namespace = add a file in BOTH id/ and en/ + list it here.
 */
export const NAMESPACES = [
  "common", "nav", "catalog", "pdp", "cart", "checkout", "pay", "order", "wa", "info", "designSystem",
] as const;

export async function loadMessages(locale: "id" | "en") {
  const entries = await Promise.all(
    NAMESPACES.map(async (ns) => [ns, (await import(`./${locale}/${ns}.json`)).default] as const),
  );
  return Object.fromEntries(entries);
}
