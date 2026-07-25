import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { supabaseServer } from "@/lib/supabase/server";

// Handles email auth links (password recovery, etc.). Supabase's email template
// points here with ?token_hash=…&type=recovery&next=/reset-password. We verify
// the token server-side (sets the session cookies) and then redirect to `next`.
// This route is OUTSIDE the middleware matcher (/portal, /admin), so it's
// reachable without an existing session — which is the whole point.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const token_hash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;
  // Only ever bounce to a path on this site. A value like "//evil.com" or
  // "https://evil.com" resolves to another origin when handed to new URL(),
  // which would turn a genuine reset link into an open redirect.
  const requested = url.searchParams.get("next") || "";
  const next = /^\/(?!\/)/.test(requested) ? requested : "/reset-password";

  if (token_hash && type) {
    const supabase = supabaseServer();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });
    if (!error) {
      return NextResponse.redirect(new URL(next, url.origin));
    }
  }

  // Missing/expired/invalid link → back to login with a friendly message.
  return NextResponse.redirect(new URL("/login?error=reset", url.origin));
}
