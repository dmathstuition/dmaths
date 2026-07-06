"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Logo from "@/components/Logo";

const SEEN_KEY = "dmaths-onboarded";

const SLIDES = [
  {
    emoji: "🎓",
    title: "Welcome to D-Maths",
    body: "A virtual learning community for students across Nigeria — maths, sciences & coding.",
  },
  {
    emoji: "📺",
    title: "Learn live, from home",
    body: "Interactive online classes and real projects, with prep for WAEC, JAMB, IGCSE, SAT & A-Levels.",
  },
  {
    emoji: "📈",
    title: "Track every step",
    body: "Grades, attendance, badges and messages — a personal portal that shows real growth.",
  },
  {
    emoji: "🚀",
    title: "Ready to begin?",
    body: "Create your account in minutes, or sign in if you're already enrolled.",
  },
];

// First-run onboarding shown once to new visitors, before the landing page.
// Remembered in localStorage so returning users go straight in.
export default function OnboardingSplash() {
  const router = useRouter();
  const [show, setShow] = useState(false);
  const [i, setI] = useState(0);
  const [touchX, setTouchX] = useState<number | null>(null);

  useEffect(() => {
    try {
      // Skip if already seen, or already running as an installed app.
      const standalone = window.matchMedia("(display-mode: standalone)").matches;
      if (!localStorage.getItem(SEEN_KEY) && !standalone) setShow(true);
    } catch {
      setShow(true);
    }
  }, []);

  function finish(to?: string) {
    try { localStorage.setItem(SEEN_KEY, "1"); } catch {}
    setShow(false);
    if (to) router.push(to);
  }

  const last = i === SLIDES.length - 1;
  const next = () => (last ? finish() : setI(i + 1));

  function onTouchEnd(endX: number) {
    if (touchX === null) return;
    const dx = endX - touchX;
    if (dx < -40 && !last) setI(i + 1);
    if (dx > 40 && i > 0) setI(i - 1);
    setTouchX(null);
  }

  if (!show) return null;
  const s = SLIDES[i];

  return (
    <div
      className="boardgrid fixed inset-0 z-[100] flex flex-col bg-board px-6 py-8 text-white"
      onTouchStart={(e) => setTouchX(e.changedTouches[0].clientX)}
      onTouchEnd={(e) => onTouchEnd(e.changedTouches[0].clientX)}
    >
      <div className="flex items-center justify-between">
        <Logo light />
        <button onClick={() => finish()} className="text-sm font-semibold text-white/50 hover:text-white">
          Skip
        </button>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <div className="hero-glow absolute h-64 w-64 rounded-full" />
        <div key={i} className="relative flex flex-col items-center" style={{ animation: "revealUp .5s ease" }}>
          <span className="mb-8 flex h-28 w-28 items-center justify-center rounded-[2rem] bg-white/10 text-6xl ring-1 ring-white/15">
            {s.emoji}
          </span>
          <h1 className="max-w-sm font-display text-3xl font-extrabold leading-tight">{s.title}</h1>
          <p className="mt-3 max-w-xs text-[15px] leading-relaxed text-white/60">{s.body}</p>
        </div>
      </div>

      {/* Dots */}
      <div className="mb-6 flex items-center justify-center gap-2">
        {SLIDES.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setI(idx)}
            aria-label={`Slide ${idx + 1}`}
            className={`h-2 rounded-full transition-all ${idx === i ? "w-6 bg-gold" : "w-2 bg-white/25"}`}
          />
        ))}
      </div>

      {/* Actions */}
      {last ? (
        <div className="space-y-3">
          <button onClick={() => finish("/apply")} className="btn-gold w-full !min-h-[52px] !rounded-full !text-base">
            Get started
          </button>
          <button
            onClick={() => finish("/login")}
            className="btn w-full !min-h-[52px] !rounded-full border border-white/25 bg-white/5 text-white hover:bg-white/10"
          >
            I already have an account
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <button onClick={() => finish()} className="px-2 text-sm font-semibold text-white/45 hover:text-white">
            Explore the site
          </button>
          <button onClick={next} className="btn-gold !min-h-[48px] !rounded-full !px-8 !text-base">
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
