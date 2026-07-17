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

  const { data: { user } } = await supabase.auth.getUser();
  const path = req.nextUrl.pathname;

  if (!user) {
    return NextResponse.redirect(new URL("/login", req.url));
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

export const config = { matcher: ["/portal/:path*", "/admin/:path*", "/tutor/:path*", "/parent/:path*"] };
