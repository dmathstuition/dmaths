import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { siteBaseUrl } from "@/lib/siteUrl";

// One-click unsubscribe from the blog newsletter, linked from every email.
// The subscriber's opaque id is the token. Always redirects to a friendly page.
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get("id") ?? "";
  if (id) {
    try { await supabaseAdmin().from("blog_subscribers").update({ unsubscribed_at: new Date().toISOString() }).eq("id", id); }
    catch { /* ignore — still show confirmation */ }
  }
  return NextResponse.redirect(`${siteBaseUrl()}/blog/unsubscribe`);
}
