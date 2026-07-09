import type { MetadataRoute } from "next";
import { siteBaseUrl } from "@/lib/siteUrl";

// Public, indexable pages only — private/portal/admin routes are intentionally
// excluded (they also require auth). URLs are built from the canonical domain
// (NEXT_PUBLIC_SITE_URL via siteBaseUrl()), so this follows the custom domain.
export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteBaseUrl();
  const now = new Date();

  const routes: { path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"] }[] = [
    { path: "/", priority: 1.0, changeFrequency: "weekly" },
    { path: "/summer-camp", priority: 0.9, changeFrequency: "weekly" },
    { path: "/apply", priority: 0.8, changeFrequency: "monthly" },
    { path: "/playground", priority: 0.7, changeFrequency: "monthly" },
    { path: "/math-lab", priority: 0.7, changeFrequency: "monthly" },
    { path: "/help", priority: 0.5, changeFrequency: "monthly" },
    { path: "/privacy", priority: 0.3, changeFrequency: "yearly" },
    { path: "/terms", priority: 0.3, changeFrequency: "yearly" },
    { path: "/refunds", priority: 0.3, changeFrequency: "yearly" },
  ];

  return routes.map((r) => ({
    url: `${base}${r.path === "/" ? "" : r.path}`,
    lastModified: now,
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }));
}
