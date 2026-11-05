import type { MetadataRoute } from "next";
import { siteUrl } from "@/components/store/containers/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/api", "/*/checkout", "/*/pay/", "/*/success/", "/*/track/", "/*/cart"] }],
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
