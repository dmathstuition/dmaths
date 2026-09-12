import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireStaff } from "@/lib/authRole";
import { slugify, LAYOUTS, ACCENTS } from "@/lib/blog";

// Admin-only blog management: create / edit / publish / feature / delete posts.
// All reads for the editor (including drafts) come back through the service
// role here, since the public RLS policy only exposes published posts.
export const dynamic = "force-dynamic";

const LAYOUT_IDS = LAYOUTS.map((l) => l.id) as string[];
const ACCENT_IDS = ACCENTS.map((a) => a.id) as string[];

async function allPosts(admin: ReturnType<typeof supabaseAdmin>) {
  const { data } = await admin.from("blog_posts").select("*").order("created_at", { ascending: false });
  return data ?? [];
}

// Find a slug that's free (ignoring the post we're editing).
async function uniqueSlug(admin: ReturnType<typeof supabaseAdmin>, base: string, ignoreId?: string): Promise<string> {
  let slug = slugify(base);
  for (let n = 1; n < 50; n++) {
    const candidate = n === 1 ? slug : `${slug}-${n}`;
    const { data } = await admin.from("blog_posts").select("id").eq("slug", candidate).maybeSingle();
    if (!data || data.id === ignoreId) return candidate;
  }
  return `${slug}-${Date.now()}`;
}

export async function POST(req: Request) {
  const staff = await requireStaff();
  if (!staff || staff.role !== "admin") return NextResponse.json({ error: "Admins only." }, { status: 403 });

  const b = await req.json().catch(() => null);
  const action = String(b?.action ?? "");
  const admin = supabaseAdmin();

  if (action === "save") {
    const id = b?.id ? String(b.id) : null;
    const title = String(b?.title ?? "").trim().slice(0, 160);
    if (!title) return NextResponse.json({ error: "A title is required." }, { status: 400 });

    const desiredSlug = String(b?.slug ?? "").trim() || title;
    const layout = LAYOUT_IDS.includes(b?.layout) ? b.layout : "standard";
    const accent = ACCENT_IDS.includes(b?.accent) ? b.accent : "gold";
    const tags = Array.isArray(b?.tags)
      ? b.tags.map((t: any) => String(t).trim()).filter(Boolean).slice(0, 12)
      : String(b?.tags ?? "").split(",").map((t) => t.trim()).filter(Boolean).slice(0, 12);

    const patch: Record<string, any> = {
      title,
      excerpt: String(b?.excerpt ?? "").slice(0, 400),
      body: String(b?.body ?? "").slice(0, 40000),
      cover_url: String(b?.cover_url ?? "").trim().slice(0, 1000),
      category: String(b?.category ?? "").trim().slice(0, 60),
      tags,
      layout,
      accent,
      author: String(b?.author ?? "").trim().slice(0, 80) || "D-Maths",
      updated_at: new Date().toISOString(),
    };

    if (id) {
      patch.slug = await uniqueSlug(admin, desiredSlug, id);
      const { error } = await admin.from("blog_posts").update(patch).eq("id", id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    } else {
      patch.slug = await uniqueSlug(admin, desiredSlug);
      patch.status = "draft";
      patch.created_by = staff.id;
      const { error } = await admin.from("blog_posts").insert(patch);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true, posts: await allPosts(admin) });
  }

  // Actions that target one existing post by id.
  const id = String(b?.id ?? "");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  if (action === "publish") {
    const { data: cur } = await admin.from("blog_posts").select("published_at").eq("id", id).maybeSingle();
    const patch: Record<string, any> = { status: "published", updated_at: new Date().toISOString() };
    if (!cur?.published_at) patch.published_at = new Date().toISOString();
    const { error } = await admin.from("blog_posts").update(patch).eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, posts: await allPosts(admin) });
  }

  if (action === "unpublish") {
    const { error } = await admin.from("blog_posts").update({ status: "draft", updated_at: new Date().toISOString() }).eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, posts: await allPosts(admin) });
  }

  if (action === "feature") {
    const on = b?.featured !== false;
    // Keep a single hero: clear other features when turning one on.
    if (on) await admin.from("blog_posts").update({ featured: false }).neq("id", id);
    const { error } = await admin.from("blog_posts").update({ featured: on }).eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, posts: await allPosts(admin) });
  }

  if (action === "delete") {
    const { error } = await admin.from("blog_posts").delete().eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, posts: await allPosts(admin) });
  }

  return NextResponse.json({ error: "Unknown action." }, { status: 400 });
}
