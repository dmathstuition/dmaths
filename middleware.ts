import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Server-side route protection — replaces the old client-only requireAdmin()
export async function middleware(req: NextRequest) {
  let res = NextResponse.next({ request: req });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: (all) => {
          all.forEach(({ name, value }) => req.cookies.set(name, value));
          res = NextResponse.next({ request: req });
          all.forEach(({ name, value, options }) => res.cookies.set(name, value, options));
        },
      },
    }
  );

  const path = req.nextUrl.pathname;
  const isApi = path.startsWith("/api");

  // ── Two-factor step-up gate for API routes ───────────────────────────────
  // An account with a verified TOTP factor (currently only the admin) must reach
  // aal2 before it can call any API. The check is a LOCAL cookie-JWT decode — no
  // network — and can't be spoofed: an attacker with the real password holds a
  // real aal1 token (blocked here), and can't forge aal2 without Supabase's
  // signing key (and the route's own getUser would reject a forged token anyway).
  // Requests with no session (public form, Paystack webhook, cron) return null
  // levels and pass straight through to the route's own auth.
  if (isApi) {
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aal?.currentLevel === "aal1" && aal?.nextLevel === "aal2") {
      return NextResponse.json({ error: "Two-factor verification required. Please sign in again." }, { status: 403 });
    }
    return res;
  }

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // Same 2FA step-up gate for pages: bounce back to the code screen.
  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aal?.currentLevel === "aal1" && aal?.nextLevel === "aal2") {
    return NextResponse.redirect(new URL("/login?mfa=1", req.url));
  }

  // Admin role check — only on real navigations, not router prefetches.
  // Prefetches skipping this is safe: the actual navigation is always
  // checked, and every admin API route re-verifies the role server-side.
  const isPrefetch =
    req.headers.get("next-router-prefetch") === "1" ||
    req.headers.get("purpose") === "prefetch";

  if (path.startsWith("/admin") && !isPrefetch) {
    const { data: profile } = await supabase
      .from("profiles").select("role").eq("id", user.id).single();
    if (profile?.role !== "admin") {
      return NextResponse.redirect(new URL("/portal", req.url));
    }
  }

  // Tutor portal — tutors OR admins (admin is a superset). Anyone else → /portal.
  if (path.startsWith("/tutor") && !isPrefetch) {
    const { data: profile } = await supabase
      .from("profiles").select("role").eq("id", user.id).single();
    if (profile?.role !== "tutor" && profile?.role !== "admin") {
      return NextResponse.redirect(new URL("/portal", req.url));
    }
  }

  // Parent portal — parents only. (The layout also guards; this adds an
  // edge-level check for parity with the other portals.)
  if (path.startsWith("/parent") && !isPrefetch) {
    const { data: profile } = await supabase
      .from("profiles").select("role").eq("id", user.id).single();
    if (profile?.role !== "parent") {
      return NextResponse.redirect(new URL("/login", req.url));
    }
  }

  // Never cache authenticated pages in shared caches
  res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
  res.headers.set("Pragma", "no-cache");
  return res;
}

export const config = { matcher: ["/portal/:path*", "/admin/:path*", "/tutor/:path*", "/parent/:path*", "/api/:path*"] };
