"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import Logo from "@/components/Logo";

// Installed-app entry point (no intro animation / slides):
//  • Web browser → renders nothing; the marketing landing shows.
//  • Installed app (standalone):
//      – signed in  → straight to the portal (admin / parent / student),
//      – logged out → the marketing landing shows (same as the web).
// A plain static cover is shown only for the brief moment while we check the
// session, so a signed-in user never sees the landing flash before the portal.
export default function AppLauncher() {
  const router = useRouter();
  const [cover, setCover] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as unknown as { standalone?: boolean }).standalone === true;
    if (!standalone) return; // web browser → nothing

    setCover(true);
    (async () => {
      try {
        const supabase = supabaseBrowser();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
          const dest = profile?.role === "admin" ? "/admin" : profile?.role === "parent" ? "/parent" : "/portal";
          router.replace(dest);
          return; // keep the cover up until the portal takes over
        }
      } catch { /* not signed in */ }
      setCover(false); // logged out → reveal the landing
    })();
  }, [router]);

  if (!cover) return null;

  // Static (non-animated) cover while the session check runs.
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-board">
      <Logo light size="lg" />
    </div>
  );
}
