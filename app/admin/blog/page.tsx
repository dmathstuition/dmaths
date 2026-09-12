import { supabaseAdmin } from "@/lib/supabase/admin";
import BlogAdminClient from "@/components/admin/BlogAdminClient";
import type { BlogPost, BlogSubscriber } from "@/lib/blog";

// The admin route is already guarded (admin layout). We read through the
// service role here so drafts and the subscriber list are visible — the public
// RLS policy only exposes published posts.
export const dynamic = "force-dynamic";

export default async function AdminBlogPage() {
  const admin = supabaseAdmin();
  const [{ data: posts }, { data: subs }] = await Promise.all([
    admin.from("blog_posts").select("*").order("created_at", { ascending: false }),
    admin.from("blog_subscribers").select("*").order("created_at", { ascending: false }),
  ]);
  return <BlogAdminClient initialPosts={(posts ?? []) as BlogPost[]} subscribers={(subs ?? []) as BlogSubscriber[]} />;
}
