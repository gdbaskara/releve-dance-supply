import type { MetadataRoute } from "next";
import { getCatalog } from "@/lib/services/catalog";
import { ALL_COLLECTION_SLUGS, INFO_SLUGS } from "@/components/store/containers/format";
import { LOCALES, localeUrl } from "@/components/store/containers/seo";

/** NFR-04: every storefront URL in id + en with hreflang alternates. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { items } = await getCatalog({ pageSize: 100 });
  const paths: { path: string; priority: number; changeFrequency: "daily" | "weekly" | "monthly" }[] = [
    { path: "/", priority: 1, changeFrequency: "daily" },
    ...ALL_COLLECTION_SLUGS.map((s) => ({ path: `/c/${s}`, priority: 0.8, changeFrequency: "daily" as const })),
    ...items.map((p) => ({ path: `/p/${p.slug}`, priority: 0.7, changeFrequency: "daily" as const })),
    { path: "/size-guide", priority: 0.5, changeFrequency: "monthly" },
    ...INFO_SLUGS.map((s) => ({ path: `/info/${s}`, priority: 0.3, changeFrequency: "monthly" as const })),
  ];
  return paths.flatMap(({ path, priority, changeFrequency }) =>
    LOCALES.map((locale) => ({
      url: localeUrl(locale, path),
      changeFrequency,
      priority,
      alternates: { languages: { id: localeUrl("id", path), en: localeUrl("en", path) } },
    })),
  );
}
