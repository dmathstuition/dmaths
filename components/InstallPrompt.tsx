"use client";
import { useEffect, useState } from "react";

const DISMISS_KEY = "dmaths-install-dismissed";

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
    // Already installed (standalone) or previously dismissed → never show.
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      // iOS Safari
      (navigator as unknown as { standalone?: boolean }).standalone === true;
    if (standalone || localStorage.getItem(DISMISS_KEY) === "1") return;

    // Android / desktop Chrome: the browser fires this when installable.
    const onBIP = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BIPEvent);
      setShow(true);
    };
    window.addEventListener("beforeinstallprompt", onBIP);

    // iOS Safari never fires beforeinstallprompt — show a manual hint instead.
    const ua = window.navigator.userAgent;
    const isIOS = /iphone|ipad|ipod/i.test(ua);
    const isSafari = /safari/i.test(ua) && !/crios|fxios|chrome/i.test(ua);
    if (isIOS && isSafari) {
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
    localStorage.setItem(DISMISS_KEY, "1");
    setShow(false);
  }

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
    setShow(false);
  }

  if (!show) return null;

  return (
    <div className="fixed inset-x-3 bottom-24 z-40 mx-auto max-w-sm sm:left-6 sm:right-auto">
      <div className="glass-card flex items-start gap-3 p-4 shadow-2xl">
        <span className="text-2xl" aria-hidden="true">📲</span>
        <div className="min-w-0 flex-1">
          <p className="font-display text-sm font-bold text-ink">Install the D-Maths app</p>
          {iosHint ? (
            <p className="mt-0.5 text-[13px] leading-relaxed text-ink/60">
              Tap the <strong>Share</strong> button, then{" "}
              <strong>"Add to Home Screen"</strong> to install.
            </p>
          ) : (
            <p className="mt-0.5 text-[13px] leading-relaxed text-ink/60">
              Add it to your home screen for one-tap access — works like a real app.
            </p>
          )}
          <div className="mt-3 flex items-center gap-2">
            {!iosHint && (
              <button onClick={install} className="btn-gold !min-h-[38px] !rounded-full !px-4 !text-[13px]">
                Install
              </button>
            )}
            <button
              onClick={dismiss}
              className="text-[13px] font-semibold text-ink/45 hover:text-ink/70"
            >
              Not now
            </button>
          </div>
        </div>
        <button
          onClick={dismiss}
          aria-label="Dismiss install prompt"
          className="flex-shrink-0 text-ink/35 transition hover:text-ink/70"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
