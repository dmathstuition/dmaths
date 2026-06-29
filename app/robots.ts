import type { MetadataRoute } from "next";
import { siteBaseUrl } from "@/lib/siteUrl";

// Allow crawling of public marketing/legal pages; keep private and utility
// areas out of the index. Points crawlers at the sitemap on the canonical host.
export default function robots(): MetadataRoute.Robots {
  const base = siteBaseUrl();
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin",
        "/portal",
        "/parent",
        "/guardian/",
        "/api/",
        "/login",
        "/reset-password",
        "/auth/",
        "/offline",
      ],
    },
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
