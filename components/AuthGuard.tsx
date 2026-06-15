"use client";
import { useEffect } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";

// Closes the "press back after logout and still see the dashboard" hole.
// The browser restores authenticated pages from its back/forward cache
// (bfcache) without hitting the server, so middleware never runs. This
// guard re-checks the live session whenever the page is shown — including
// bfcache restores and tab refocus — and hard-redirects to login if the
// session is gone.
export default function AuthGuard() {
  useEffect(() => {
    const supabase = supabaseBrowser();

    async function verify() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        // full replace so the dead page can't be returned to via back again
        window.location.replace("/login");
      }
    }

    // bfcache restore fires pageshow with persisted=true
    function onPageShow(e: PageTransitionEvent) {
      if (e.persisted) verify();
    }
    function onVisible() {
      if (document.visibilityState === "visible") verify();
    }

    verify(); // also check on first mount
    window.addEventListener("pageshow", onPageShow);
    document.addEventListener("visibilitychange", onVisible);

    // react to explicit sign-out in another tab
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") window.location.replace("/login");
    });

    return () => {
      window.removeEventListener("pageshow", onPageShow);
      document.removeEventListener("visibilitychange", onVisible);
      sub.subscription.unsubscribe();
    };
  }, []);

  return null;
}
