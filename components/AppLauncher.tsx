"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { supabaseBrowser } from "@/lib/supabase/client";
import Logo from "@/components/Logo";
import { Icon, type IconName } from "@/components/Icons";

const ONBOARDED_KEY = "dmaths-app-onboarded";

type Slide = { img: string; icon: IconName; title: string; body: string };
const SLIDES: Slide[] = [
  {
    img: "/camp-hero.png",
    icon: "home",
    title: "Welcome to D-Maths",
    body: "A virtual learning community for students across Nigeria.",
  },
  {
    img: "/summer-camp-banner.png",
    icon: "book",
    title: "Learn live, from home",
    body: "Maths, sciences & coding — with prep for WAEC, JAMB, IGCSE, SAT & A-Levels.",
  },
  {
    img: "/camp-about.png",
    icon: "progress",
    title: "Track every step",
    body: "Grades, attendance, streaks and messages — all in one personal portal.",
  },
  {
    img: "/summer-camp-banner.png",
    icon: "zap",
    title: "Ready to begin?",
    body: "Create your account in minutes, or sign in if you're already enrolled.",
  },
];

// Decides the entry experience:
//  • Web browser → renders nothing (the marketing landing shows).
//  • Installed app (standalone) → first-launch intro slides → login/signup,
//    or straight to the portal if already signed in / straight to /login if
//    already onboarded.
export default function AppLauncher() {
  const router = useRouter();
  const [mode, setMode] = useState<"init" | "web" | "loading" | "slides">("init");
  const [i, setI] = useState(0);
  const [touchX, setTouchX] = useState<number | null>(null);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as unknown as { standalone?: boolean }).standalone === true;

    if (!standalone) { setMode("web"); return; }
    setMode("loading"); // cover the screen while we decide

    (async () => {
      try {
        const supabase = supabaseBrowser();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
          const dest = profile?.role === "admin" ? "/admin" : profile?.role === "parent" ? "/parent" : "/portal";
          router.replace(dest);
          return;
        }
      } catch { /* not signed in */ }

      if (localStorage.getItem(ONBOARDED_KEY) === "1") {
        router.replace("/login");
      } else {
        setMode("slides");
      }
    })();
  }, [router]);

  function finish(to: string) {
    try { localStorage.setItem(ONBOARDED_KEY, "1"); } catch {}
    router.replace(to);
  }

  const last = i === SLIDES.length - 1;
  function onTouchEnd(endX: number) {
    if (touchX === null) return;
    const dx = endX - touchX;
    if (dx < -40 && !last) setI(i + 1);
    if (dx > 40 && i > 0) setI(i - 1);
    setTouchX(null);
  }

  if (mode === "web") return null;

  if (mode === "init" || mode === "loading") {
    return (
      <div className="boardgrid fixed inset-0 z-[100] flex flex-col items-center justify-center bg-board">
        <Logo light size="lg" />
        <span className="mt-6 inline-block h-6 w-6 animate-spin rounded-full border-2 border-white/20 border-t-gold" />
      </div>
    );
  }

  const s = SLIDES[i];
  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col bg-board text-white"
      onTouchStart={(e) => setTouchX(e.changedTouches[0].clientX)}
      onTouchEnd={(e) => onTouchEnd(e.changedTouches[0].clientX)}
    >
      {/* Photo background with a slow Ken-Burns zoom + legibility overlay */}
      <div className="absolute inset-0 overflow-hidden">
        <Image key={i} src={s.img} alt="" fill priority sizes="100vw"
          className="kenburns object-cover opacity-40" />
        <div className="absolute inset-0 bg-gradient-to-b from-board/70 via-board/50 to-board" />
      </div>

      {/* Top bar */}
      <div className="relative flex items-center justify-between px-6 pt-8">
        <Logo light />
        <button onClick={() => finish("/login")} className="text-sm font-semibold text-white/60 hover:text-white">
          Skip
        </button>
      </div>

      {/* Slide content */}
      <div className="relative flex flex-1 flex-col items-center justify-center px-8 text-center">
        <span key={`icon-${i}`} className="mb-7 flex h-20 w-20 items-center justify-center rounded-[1.75rem] bg-gold text-board shadow-xl"
          style={{ animation: "revealUp .5s ease" }}>
          <Icon name={s.icon} className="h-9 w-9" />
        </span>
        <h1 key={`t-${i}`} className="max-w-sm font-display text-3xl font-extrabold leading-tight" style={{ animation: "revealUp .5s ease" }}>
          {s.title}
        </h1>
        <p className="mt-3 max-w-xs text-[15px] leading-relaxed text-white/70">{s.body}</p>
      </div>

      {/* Dots */}
      <div className="relative mb-6 flex items-center justify-center gap-2">
        {SLIDES.map((_, idx) => (
          <button key={idx} onClick={() => setI(idx)} aria-label={`Slide ${idx + 1}`}
            className={`h-2 rounded-full transition-all ${idx === i ? "w-6 bg-gold" : "w-2 bg-white/25"}`} />
        ))}
      </div>

      {/* Actions */}
      <div className="relative px-6 pb-10">
        {last ? (
          <div className="space-y-3">
            <button onClick={() => finish("/apply")} className="btn-gold w-full !min-h-[52px] !rounded-full !text-base">
              Get started
            </button>
            <button onClick={() => finish("/login")}
              className="btn w-full !min-h-[52px] !rounded-full border border-white/25 bg-white/5 text-white hover:bg-white/10">
              I already have an account
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <button onClick={() => finish("/login")} className="px-2 text-sm font-semibold text-white/50 hover:text-white">
              Sign in
            </button>
            <button onClick={() => setI(i + 1)} className="btn-gold !min-h-[48px] !rounded-full !px-8 !text-base">
              Next →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
