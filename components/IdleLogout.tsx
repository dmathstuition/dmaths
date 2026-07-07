"use client";
import { useEffect } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";

// Security: sign the user out after a period of inactivity (and immediately if
// the app is reopened after having been idle that long). Mounted only in
// authenticated shells, so it never runs on the landing/login pages.
// `minutes` lets each role set its own window (students/parents 30, admins 120).
// Exported so the login flow can reset the clock on a fresh sign-in — otherwise a
// stale timestamp from a previous session would sign the user out the instant they
// land on the portal, in an unbreakable loop.
export const IDLE_ACTIVITY_KEY = "dmaths-last-activity";

export default function IdleLogout({ minutes = 30 }: { minutes?: number }) {
  useEffect(() => {
    const IDLE_MS = minutes * 60 * 1000;
    let timer: number | undefined;

    const now = () => Date.now();
    const setLast = () => {
      try { localStorage.setItem(IDLE_ACTIVITY_KEY, String(now())); } catch {}
    };
    const getLast = () => {
      try { return Number(localStorage.getItem(IDLE_ACTIVITY_KEY)) || now(); } catch { return now(); }
    };

    async function logout() {
      try { await supabaseBrowser().auth.signOut(); } catch {}
      window.location.replace("/login?timeout=1");
    }

    function check() {
      if (now() - getLast() > IDLE_MS) logout();
    }

    // Throttled activity tracking — at most one write every ~5s.
    let lastWrite = 0;
    function onActivity() {
      const t = now();
      if (t - lastWrite > 5000) { lastWrite = t; setLast(); }
    }

    // If there's no timestamp yet (fresh sign-in), start the clock now.
    try { if (!localStorage.getItem(IDLE_ACTIVITY_KEY)) setLast(); } catch {}

    const events = ["mousemove", "keydown", "click", "scroll", "touchstart"];
    events.forEach(e => window.addEventListener(e, onActivity, { passive: true }));
    const onVisible = () => { if (document.visibilityState === "visible") check(); };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", check);

    check(); // immediate: catch a stale session on load
    timer = window.setInterval(check, 30_000);

    return () => {
      events.forEach(e => window.removeEventListener(e, onActivity));
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", check);
      if (timer) clearInterval(timer);
    };
  }, [minutes]);

  return null;
}
