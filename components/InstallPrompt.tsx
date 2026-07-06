"use client";
import { useEffect, useState } from "react";

// Session-only key: "Not now" hides it for THIS visit but it returns on the
// next visit — it keeps prompting until the app is actually installed.
const DISMISS_KEY = "dmaths-install-dismissed-session";

// Captured beforeinstallprompt event (Chrome/Edge/Android). Not in TS lib types.
type BIPEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export default function InstallPrompt() {
  const [deferred, setDeferred] = useState<BIPEvent | null>(null);
  const [iosHint, setIosHint] = useState(false);
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Already installed (standalone) → never show. Otherwise show, and only
    // stay hidden if dismissed earlier in THIS browser session.
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as unknown as { standalone?: boolean }).standalone === true;
    if (standalone) return;
    const dismissedThisSession = sessionStorage.getItem(DISMISS_KEY) === "1";

    // Android / desktop Chrome: the browser fires this when installable.
    const onBIP = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BIPEvent);
      if (!dismissedThisSession) setShow(true);
    };
    window.addEventListener("beforeinstallprompt", onBIP);

    // iOS Safari never fires beforeinstallprompt — show a manual hint instead.
    const ua = window.navigator.userAgent;
    const isIOS = /iphone|ipad|ipod/i.test(ua);
    const isSafari = /safari/i.test(ua) && !/crios|fxios|chrome/i.test(ua);
    if (isIOS && isSafari && !dismissedThisSession) {
      setIosHint(true);
      setShow(true);
    }

    const onInstalled = () => setShow(false);
    window.addEventListener("appinstalled", onInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBIP);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  function dismiss() {
    sessionStorage.setItem(DISMISS_KEY, "1"); // returns next visit
    setShow(false);
  }

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    setDeferred(null);
    if (outcome === "accepted") setShow(false);
    else dismiss(); // declined — rest this session, ask again next visit
  }

  if (!show) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[70] p-3 sm:inset-x-auto sm:left-6 sm:bottom-6 sm:max-w-sm">
      <div className="glass-card flex items-start gap-3 p-4 shadow-2xl ring-1 ring-gold/30">
        <span className="text-2xl" aria-hidden="true">📲</span>
        <div className="min-w-0 flex-1">
          <p className="font-display text-sm font-bold text-ink">Get the D-Maths app</p>
          {iosHint ? (
            <p className="mt-0.5 text-[13px] leading-relaxed text-ink/60">
              Tap the <strong>Share</strong> icon, then <strong>"Add to Home Screen"</strong> to install.
            </p>
          ) : (
            <p className="mt-0.5 text-[13px] leading-relaxed text-ink/60">
              Install it for one-tap access, class reminders and notifications — works like a real app.
            </p>
          )}
          <div className="mt-3 flex items-center gap-2">
            {!iosHint && (
              <button onClick={install} className="btn-gold !min-h-[40px] !rounded-full !px-5 !text-[13px]">
                Install app
              </button>
            )}
            <button onClick={dismiss} className="text-[13px] font-semibold text-ink/45 hover:text-ink/70">
              Not now
            </button>
          </div>
        </div>
        <button onClick={dismiss} aria-label="Dismiss" className="flex-shrink-0 text-ink/35 transition hover:text-ink/70">
          ✕
        </button>
      </div>
    </div>
  );
}
