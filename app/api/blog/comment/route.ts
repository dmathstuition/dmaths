import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { rateLimit, clientKey } from "@/lib/ratelimit";
import { notifyAdmins } from "@/lib/notify";

// Public comment submission. Comments are stored as "pending" and only appear
// once an admin approves them. Rate-limited per IP. Service role only.
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!rateLimit(clientKey(req, "blog-comment"), 5, 60_000)) {
    return NextResponse.json({ error: "You're commenting quickly — please wait a moment." }, { status: 429 });
  }
  const b = await req.json().catch(() => null);
  const postId = String(b?.postId ?? "");
  const body = String(b?.body ?? "").trim().slice(0, 2000);
  const authorName = (String(b?.authorName ?? "").trim().slice(0, 60)) || "Anonymous";
  const clientId = String(b?.clientId ?? "").slice(0, 64) || null;
  if (!postId || !body) return NextResponse.json({ error: "Please write a comment." }, { status: 400 });

  const admin = supabaseAdmin();
  const { data: post } = await admin.from("blog_posts").select("id, title, status, slug").eq("id", postId).maybeSingle();
  if (!post || post.status !== "published") return NextResponse.json({ error: "Post not found" }, { status: 404 });

  const { error } = await admin.from("blog_comments").insert({ post_id: postId, author_name: authorName, body, client_id: clientId });
  if (error) return NextResponse.json({ error: "Couldn't post your comment — please try again." }, { status: 500 });

  try {
    await notifyAdmins(admin, {
      title: "💬 New blog comment to review",
      body: `${authorName} on "${post.title}": ${body.slice(0, 80)}${body.length > 80 ? "…" : ""}`,
      link: "/admin/blog",
    });
  } catch { /* non-blocking */ }

  return NextResponse.json({ ok: true, message: "Thanks! Your comment will appear once it's approved." });
}
