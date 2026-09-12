import type { MetadataRoute } from "next";
import { siteBaseUrl } from "@/lib/siteUrl";
import { supabaseAdmin } from "@/lib/supabase/admin";

// Public, indexable pages only — private/portal/admin routes are intentionally
// excluded (they also require auth). URLs are built from the canonical domain
// (NEXT_PUBLIC_SITE_URL via siteBaseUrl()), so this follows the custom domain.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteBaseUrl();
  const now = new Date();

  const routes: { path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"] }[] = [
    { path: "/", priority: 1.0, changeFrequency: "weekly" },
    { path: "/about", priority: 0.7, changeFrequency: "monthly" },
    { path: "/programmes", priority: 0.8, changeFrequency: "monthly" },
    { path: "/pricing", priority: 0.8, changeFrequency: "monthly" },
    { path: "/blog", priority: 0.7, changeFrequency: "weekly" },
    { path: "/contact", priority: 0.6, changeFrequency: "monthly" },
    { path: "/apply", priority: 0.8, changeFrequency: "monthly" },
    { path: "/playground", priority: 0.7, changeFrequency: "monthly" },
    { path: "/math-lab", priority: 0.7, changeFrequency: "monthly" },
    { path: "/help", priority: 0.5, changeFrequency: "monthly" },
    { path: "/privacy", priority: 0.3, changeFrequency: "yearly" },
    { path: "/terms", priority: 0.3, changeFrequency: "yearly" },
    { path: "/refunds", priority: 0.3, changeFrequency: "yearly" },
  ];

  const entries: MetadataRoute.Sitemap = routes.map((r) => ({
    url: `${base}${r.path === "/" ? "" : r.path}`,
    lastModified: now,
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }));

  // Published blog posts (best-effort — never let the sitemap fail the build).
  try {
    const { data } = await supabaseAdmin()
      .from("blog_posts").select("slug, published_at, updated_at").eq("status", "published")
      .order("published_at", { ascending: false }).limit(500);
    for (const p of data ?? []) {
      entries.push({
        url: `${base}/blog/${p.slug}`,
        lastModified: p.updated_at ? new Date(p.updated_at) : (p.published_at ? new Date(p.published_at) : now),
        changeFrequency: "monthly",
        priority: 0.6,
      });
    }
  } catch { /* table may not exist yet — skip blog URLs */ }

  return entries;
}
