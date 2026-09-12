import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { rateLimit, clientKey } from "@/lib/ratelimit";
import { REACTIONS } from "@/lib/blog";

// Public post reactions. GET returns the counts for a post plus which emoji
// this browser has reacted with; POST toggles one emoji for this browser.
// All access is via the service role — the table has no public RLS policies.
export const dynamic = "force-dynamic";

const VALID = new Set<string>(REACTIONS.map((r) => r.emoji));

async function summary(admin: ReturnType<typeof supabaseAdmin>, postId: string, clientId: string) {
  const { data } = await admin.from("blog_reactions").select("emoji, client_id").eq("post_id", postId);
  const counts: Record<string, number> = {};
  const mine: string[] = [];
  for (const r of data ?? []) {
    counts[r.emoji] = (counts[r.emoji] ?? 0) + 1;
    if (clientId && r.client_id === clientId) mine.push(r.emoji);
  }
  return { counts, mine };
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const postId = url.searchParams.get("postId") ?? "";
  const clientId = url.searchParams.get("clientId") ?? "";
  if (!postId) return NextResponse.json({ error: "postId required" }, { status: 400 });
  return NextResponse.json(await summary(supabaseAdmin(), postId, clientId));
}

export async function POST(req: Request) {
  if (!rateLimit(clientKey(req, "blog-react"), 40, 60_000)) {
    return NextResponse.json({ error: "Too many reactions — slow down a moment." }, { status: 429 });
  }
  const b = await req.json().catch(() => null);
  const postId = String(b?.postId ?? "");
  const clientId = String(b?.clientId ?? "").slice(0, 64);
  const emoji = String(b?.emoji ?? "");
  if (!postId || !clientId || !VALID.has(emoji)) return NextResponse.json({ error: "Bad request" }, { status: 400 });

  const admin = supabaseAdmin();
  // Confirm the post exists and is published before recording a reaction.
  const { data: post } = await admin.from("blog_posts").select("id, status").eq("id", postId).maybeSingle();
  if (!post || post.status !== "published") return NextResponse.json({ error: "Post not found" }, { status: 404 });

  const { data: existing } = await admin.from("blog_reactions")
    .select("id").eq("post_id", postId).eq("client_id", clientId).eq("emoji", emoji).maybeSingle();

  if (existing) await admin.from("blog_reactions").delete().eq("id", existing.id);
  else await admin.from("blog_reactions").insert({ post_id: postId, client_id: clientId, emoji });

  return NextResponse.json({ ok: true, ...(await summary(admin, postId, clientId)) });
}
