"use client";
import { useState, useEffect } from "react";
import Link from "next/link";

// NDPA-style affirmative notice. Shows once until the visitor acknowledges,
// then remembers the choice. Essential cookies only — no tracking — so this
// is a notice + acknowledgement, which is the appropriate bar here.
export default function CookieBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem("dm_privacy_ack")) setShow(true);
    } catch { /* storage blocked — show anyway */ setShow(true); }
  }, []);

  function accept() {
    try { localStorage.setItem("dm_privacy_ack", new Date().toISOString()); } catch {}
    // Signal consent so analytics can start this session (see GoogleAnalytics.tsx).
    try { window.dispatchEvent(new Event("dm-consent")); } catch {}
    setShow(false);
  }

  if (!show) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[100] p-3 sm:p-4">
      <div className="mx-auto flex max-w-3xl flex-col gap-3 rounded-2xl bg-board p-5 text-white shadow-2xl sm:flex-row sm:items-center">
        <p className="flex-1 text-sm leading-relaxed text-white/80">
          We use essential cookies to keep you securely signed in, and — once you agree —
          anonymous analytics (Google Analytics) to understand how the site is used. We process
          student information solely to deliver tuition, in line with the Nigeria Data Protection
          Act. See our{" "}
          <Link href="/privacy" className="font-semibold text-gold-soft underline">Privacy Policy</Link>.
        </p>
        <button onClick={accept} className="btn-gold !min-h-[42px] whitespace-nowrap">
          I agree
        </button>
      </div>
    </div>
  );
}
