import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireStaff } from "@/lib/authRole";
import { sendEmail } from "@/lib/email";
import { siteBaseUrl } from "@/lib/siteUrl";
import { slugify, previewOf, LAYOUTS, ACCENTS } from "@/lib/blog";

// Admin-only blog management: create / edit / publish / feature / delete posts,
// and email subscribers when a post goes live. All reads for the editor
// (including drafts) come back through the service role here, since the public
// RLS policy only exposes published posts.
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Gmail consumer quota is ~100/day; cap one blast well under that.
const MAX_PER_BLAST = 80;

// Email every active subscriber about a freshly published post. Best-effort:
// returns how many were sent, and a note when the list is capped or email
// isn't configured. Never throws — publishing must not fail because email did.
async function announce(admin: ReturnType<typeof supabaseAdmin>, post: any): Promise<{ sent: number; failed: number; note?: string }> {
  if (!process.env.EMAIL_RELAY_URL) return { sent: 0, failed: 0, note: "email isn't configured, so no subscribers were emailed" };
  const { data: subs } = await admin.from("blog_subscribers").select("id, email").is("unsubscribed_at", null);
  const list = (subs ?? []).filter((s) => s.email);
  if (!list.length) return { sent: 0, failed: 0 };

  const capped = list.length > MAX_PER_BLAST;
  const batch = capped ? list.slice(0, MAX_PER_BLAST) : list;
  const base = siteBaseUrl();
  const postUrl = `${base}/blog/${post.slug}`;
  const summary = previewOf({ excerpt: post.excerpt, body: post.body }, 300);

  let sent = 0, failed = 0;
  for (const s of batch) {
    const unsub = `${base}/api/blog/unsubscribe?id=${s.id}`;
    const body = `We've just published a new post on the Novelia blog:\n\n${post.title}\n\n${summary}\n\nRead the full post: ${postUrl}\n\n—\nYou're receiving this because you subscribed to the Novelia blog. To stop these emails, unsubscribe: ${unsub}`;
    const okSent = await sendEmail("notice", s.email, {
      firstName: "there",
      title: `New on the blog: ${post.title}`,
      body,
      loginUrl: postUrl,
    });
    okSent ? sent++ : failed++;
  }
  const note = capped ? `emailed the first ${MAX_PER_BLAST} of ${list.length} subscribers (Gmail daily limit); the rest weren't emailed` : undefined;
  return { sent, failed, note };
}

const LAYOUT_IDS = LAYOUTS.map((l) => l.id) as string[];
const ACCENT_IDS = ACCENTS.map((a) => a.id) as string[];

async function allPosts(admin: ReturnType<typeof supabaseAdmin>) {
  const { data } = await admin.from("blog_posts").select("*").order("created_at", { ascending: false });
  return data ?? [];
}

async function allComments(admin: ReturnType<typeof supabaseAdmin>) {
  const { data } = await admin.from("blog_comments").select("*").order("created_at", { ascending: false });
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
      author: String(b?.author ?? "").trim().slice(0, 80) || "Novelia",
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

  // Comment moderation (targets a comment by id).
  if (action === "comment_approve" || action === "comment_delete") {
    const commentId = String(b?.commentId ?? "");
    if (!commentId) return NextResponse.json({ error: "commentId required" }, { status: 400 });
    if (action === "comment_approve") {
      const { error } = await admin.from("blog_comments").update({ status: "approved" }).eq("id", commentId);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    } else {
      const { error } = await admin.from("blog_comments").delete().eq("id", commentId);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true, comments: await allComments(admin) });
  }

  // Actions that target one existing post by id.
  const id = String(b?.id ?? "");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  if (action === "publish") {
    const { data: cur } = await admin.from("blog_posts").select("*").eq("id", id).maybeSingle();
    if (!cur) return NextResponse.json({ error: "Post not found." }, { status: 404 });
    const patch: Record<string, any> = { status: "published", updated_at: new Date().toISOString() };
    if (!cur.published_at) patch.published_at = new Date().toISOString();
    const { error } = await admin.from("blog_posts").update(patch).eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Email subscribers the first time a post is published.
    let message = "Post published.";
    if (!cur.announced_at) {
      const r = await announce(admin, { ...cur, ...patch });
      await admin.from("blog_posts").update({ announced_at: new Date().toISOString() }).eq("id", id);
      message = r.sent > 0
        ? `Post published and emailed to ${r.sent} subscriber${r.sent === 1 ? "" : "s"}${r.failed ? ` (${r.failed} failed)` : ""}${r.note ? ` — ${r.note}` : ""}.`
        : `Post published${r.note ? ` — ${r.note}` : " — no subscribers to email yet"}.`;
    }
    return NextResponse.json({ ok: true, message, posts: await allPosts(admin) });
  }

  // Manually (re)send the post to subscribers.
  if (action === "notify") {
    const { data: cur } = await admin.from("blog_posts").select("*").eq("id", id).maybeSingle();
    if (!cur) return NextResponse.json({ error: "Post not found." }, { status: 404 });
    if (cur.status !== "published") return NextResponse.json({ error: "Publish the post before emailing subscribers." }, { status: 400 });
    const r = await announce(admin, cur);
    await admin.from("blog_posts").update({ announced_at: new Date().toISOString() }).eq("id", id);
    const message = r.sent > 0
      ? `Emailed ${r.sent} subscriber${r.sent === 1 ? "" : "s"}${r.failed ? ` (${r.failed} failed)` : ""}${r.note ? ` — ${r.note}` : ""}.`
      : `No emails sent${r.note ? ` — ${r.note}` : " — no active subscribers"}.`;
    return NextResponse.json({ ok: true, message, posts: await allPosts(admin) });
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
