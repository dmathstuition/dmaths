import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { rateLimit, clientKey } from "@/lib/ratelimit";
import { notifyAdmins } from "@/lib/notify";
import { isEmail } from "@/lib/blog";

// Public newsletter sign-up for the blog. Rate-limited per IP. Idempotent:
// re-subscribing an existing email just re-activates it. All writes go through
// the service role — the table has no public RLS policies.
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!rateLimit(clientKey(req, "blog-subscribe"), 6, 60_000)) {
    return NextResponse.json({ error: "You're going a bit fast — please try again in a moment." }, { status: 429 });
  }

  const b = await req.json().catch(() => null);
  const email = String(b?.email ?? "").trim().toLowerCase().slice(0, 200);
  if (!isEmail(email)) return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });

  const admin = supabaseAdmin();
  const { data: existing } = await admin.from("blog_subscribers").select("id, unsubscribed_at").eq("email", email).maybeSingle();

  if (existing) {
    if (existing.unsubscribed_at) {
      await admin.from("blog_subscribers").update({ unsubscribed_at: null }).eq("id", existing.id);
      return NextResponse.json({ ok: true, message: "Welcome back — you're subscribed again!" });
    }
    return NextResponse.json({ ok: true, message: "You're already on the list — thank you!" });
  }

  const { error } = await admin.from("blog_subscribers").insert({ email, source: "blog" });
  if (error) return NextResponse.json({ error: "We couldn't sign you up just now — please try again." }, { status: 500 });

  // Let the team know (best-effort).
  try { await notifyAdmins(admin, { title: "📫 New blog subscriber", body: email, link: "/admin/blog" }); } catch { /* non-blocking */ }

  return NextResponse.json({ ok: true, message: "You're on the list — thank you!" });
}
