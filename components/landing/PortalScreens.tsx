"use client";
import { useState } from "react";
import { Icon } from "@/components/Icons";
import PortalPhone from "@/components/landing/PortalPhone";

// Real app screenshots in a phone frame. Tap the phone to flip between the two
// views with a smooth crossfade. If an image ever fails to load, it falls back
// to the built-in mock so the landing page is never broken.
const SHOTS = [
  "/Screenshot_20260722-085524.jpg", // shown first
  "/Screenshot_20260722-085451.jpg", // shown on tap
];

export default function PortalScreens({ className = "" }: { className?: string }) {
  const [i, setI] = useState(0);
  const [failed, setFailed] = useState(false);

  if (failed) return <PortalPhone className={className} />;

  return (
    <button
      type="button"
      onClick={() => setI((n) => (n + 1) % SHOTS.length)}
      aria-label="Tap to see another view of the app"
      className={`group relative mx-auto block w-[250px] cursor-pointer ${className}`}
    >
      {/* soft brand glow behind the device */}
      <span aria-hidden className="pointer-events-none absolute -inset-6 -z-10 rounded-[3rem] bg-gradient-to-b from-gold/25 via-ink/10 to-transparent blur-2xl" />

      {/* device frame */}
      <span className="block rounded-[2.6rem] bg-[#0c0c0e] p-2 shadow-[0_30px_60px_-15px_rgba(10,42,79,.55)] ring-1 ring-white/10">
        <span className="relative block aspect-[9/19.3] overflow-hidden rounded-[2.1rem] bg-chalk">
          {SHOTS.map((src, idx) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={src}
              src={src}
              alt={idx === 0 ? "The D-Maths learner dashboard on a phone" : "The D-Maths app — another view"}
              onError={() => setFailed(true)}
              className={`absolute inset-0 h-full w-full object-cover object-top transition-all duration-500 ease-out ${
                i === idx ? "scale-100 opacity-100" : "scale-105 opacity-0"
              }`}
            />
          ))}
        </span>
      </span>

      {/* tap hint + which view (hidden while printing / decorative) */}
      <span className="pointer-events-none absolute -bottom-3 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[10px] font-bold text-white/85 ring-1 ring-white/15 backdrop-blur transition group-hover:bg-white/15">
        <Icon name="eye" className="h-3 w-3" /> Tap to switch
        <span className="flex gap-1">
          {SHOTS.map((_, idx) => (
            <span key={idx} className={`h-1.5 w-1.5 rounded-full ${i === idx ? "bg-gold" : "bg-white/30"}`} />
          ))}
        </span>
      </span>
    </button>
  );
}
