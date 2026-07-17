"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

// First-visit promo: the summer-camp flyer pops over a blurred landing page.
// Click it (or "Register") → /summer-camp; dismiss (✕ / "Maybe later" / backdrop /
// Esc) → stay on the landing page. Shows at most once per day per browser, and
// only once the flyer image has actually loaded — so there's never a broken popup
// before the image is uploaded.
//
// To change/refresh the flyer: replace public/summer-flyer.jpg and bump VERSION
// below (that makes everyone see it again).
const FLYER_SRC = "/summer-flyer.jpg";
const VERSION = "2026-summer";
const SEEN_KEY = `dmaths-flyer-${VERSION}`;

export default function FlyerPopup() {
  const [open, setOpen] = useState(false);
  const [enter, setEnter] = useState(false);

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    let last: string | null = null;
    try { last = localStorage.getItem(SEEN_KEY); } catch { /* private mode */ }
    if (last === today) return;

    // Preload — only open the popup if the flyer image is present & loads.
    const img = new window.Image();
    img.onload = () => setOpen(true);
    img.onerror = () => { /* flyer not uploaded yet → don't show anything */ };
    img.src = FLYER_SRC;
  }, []);

  useEffect(() => {
    if (!open) return;
    requestAnimationFrame(() => setEnter(true));
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") dismiss(); };
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener("keydown", onKey); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function dismiss() {
    try { localStorage.setItem(SEEN_KEY, new Date().toISOString().slice(0, 10)); } catch { /* ignore */ }
    setEnter(false);
    setTimeout(() => setOpen(false), 200);
  }

  if (!open) return null;

  return (
    <div role="dialog" aria-modal="true" aria-label="D-Maths Summer Camp"
      className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Blurred, dark backdrop — clicking it dismisses. */}
      <button aria-label="Close" onClick={dismiss}
        className={`absolute inset-0 bg-board/50 backdrop-blur-md transition-opacity duration-300 ${enter ? "opacity-100" : "opacity-0"}`} />

      {/* Flyer card */}
      <div className={`relative z-10 w-full max-w-md transition-all duration-300 ${enter ? "scale-100 opacity-100" : "scale-95 opacity-0"}`}>
        <button onClick={dismiss} aria-label="Close"
          className="absolute -right-2 -top-2 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-white text-lg font-bold text-ink shadow-lg transition hover:bg-chalk">
          ✕
        </button>

        <Link href="/summer-camp" onClick={dismiss} className="block overflow-hidden rounded-2xl shadow-2xl ring-1 ring-white/20">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={FLYER_SRC} alt="D-Maths Summer Camp — registration is open" className="h-auto w-full" />
        </Link>

        <div className="mt-4 flex flex-col items-center gap-2">
          <Link href="/summer-camp" onClick={dismiss} className="btn-gold w-full max-w-xs !rounded-full !text-base shadow-lg shadow-gold/30">
            Register for Summer Camp →
          </Link>
          <button onClick={dismiss} className="text-sm font-semibold text-white/85 hover:text-white">Maybe later</button>
        </div>
      </div>
    </div>
  );
}
