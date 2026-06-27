"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { DISCOUNT_PCT } from "@/lib/summerCamp";

const DISMISS_KEY = "dmaths-summer-camp-banner-dismissed";

export default function SummerCampBanner() {
  // Start hidden so we never flash before reading localStorage on the client.
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(DISMISS_KEY) !== "1") setShow(true);
  }, []);

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, "1");
    setShow(false);
  }

  if (!show) return null;

  return (
    <div className="relative z-[60] bg-board px-4 py-2.5 text-center text-sm font-semibold text-white">
      <Link href="/summer-camp" className="group inline-flex flex-wrap items-center justify-center gap-x-2">
        <span aria-hidden="true">☀️</span>
        <span>
          Summer Camp is open — Maths &amp; Coding, all summer break.
          {DISCOUNT_PCT > 0 && <strong className="text-gold"> {DISCOUNT_PCT}% off!</strong>}
        </span>
        <span className="text-gold underline decoration-gold/60 underline-offset-2 group-hover:decoration-gold">
          See packages →
        </span>
      </Link>
      <button
        onClick={dismiss}
        aria-label="Dismiss summer camp banner"
        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 transition hover:text-white"
      >
        ✕
      </button>
    </div>
  );
}
