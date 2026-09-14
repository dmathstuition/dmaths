"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import Logo from "@/components/Logo";

// Installed-app entry point.
//  • Web browser → renders nothing; the marketing landing shows.
//  • Installed app (standalone): an animated Novelia splash plays while we
//    check the session, then the app goes STRAIGHT INTO its own flow:
//      – signed in  → the portal (admin / parent / student),
//      – logged out → the sign in / sign up page (/login) — never the
//        marketing homepage.
// The splash background matches the native launch screen (brand navy), so the
// two blend into one smooth open.
const MIN_SPLASH_MS = 1200; // let the animation breathe before we navigate

export default function AppLauncher() {
  const router = useRouter();
  const [cover, setCover] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as unknown as { standalone?: boolean }).standalone === true;
    if (!standalone) return; // web browser → nothing

    setCover(true);
    const started = Date.now();

    (async () => {
      let dest = "/login"; // logged out → the sign in / sign up flow
      try {
        const supabase = supabaseBrowser();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
          dest = profile?.role === "admin" ? "/admin" : profile?.role === "parent" ? "/parent" : "/portal";
        }
      } catch { /* not signed in → /login */ }

      const wait = Math.max(0, MIN_SPLASH_MS - (Date.now() - started));
      setTimeout(() => router.replace(dest), wait); // cover stays up until we navigate away
    })();
  }, [router]);

  if (!cover) return null;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden bg-board">
      {/* soft brand glow */}
      <div className="novelia-splash-glow pointer-events-none absolute h-72 w-72 rounded-full bg-gold/25 blur-3xl" />
      <div className="novelia-splash-glow pointer-events-none absolute h-96 w-96 rounded-full bg-ink/30 blur-3xl [animation-delay:.6s]" />

      {/* animated logo */}
      <div className="novelia-splash-logo relative">
        <Logo light size="lg" />
      </div>

      {/* loading bar */}
      <div className="novelia-splash-track relative mt-10 h-1 w-40 rounded-full bg-white/12">
        <span className="rounded-full bg-gradient-to-r from-transparent via-gold to-transparent" />
      </div>

      {/* dots */}
      <div className="mt-5 flex items-center gap-1.5">
        <span className="novelia-splash-dot h-2 w-2 rounded-full bg-white/70" />
        <span className="novelia-splash-dot h-2 w-2 rounded-full bg-white/70 [animation-delay:.15s]" />
        <span className="novelia-splash-dot h-2 w-2 rounded-full bg-white/70 [animation-delay:.3s]" />
      </div>
    </div>
  );
}
