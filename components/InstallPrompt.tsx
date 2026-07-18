"use client";
import { useEffect, useState } from "react";
import { Icon } from "@/components/Icons";

// A PERSISTENT "Get the app" button. It stays on screen until the app is
// actually installed — never permanently dismissible — and works on every
// platform, not just when Chrome happens to fire beforeinstallprompt:
//  • Android/Chrome/Edge/desktop → native one-tap install when available,
//    otherwise clear browser-menu steps.
//  • iPhone/iPad (Safari) → Share → "Add to Home Screen" steps (iOS has no
//    programmatic install).
type BIPEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};
type Platform = "android" | "ios" | "desktop" | "other";

export default function InstallPrompt() {
  const [deferred, setDeferred] = useState<BIPEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [open, setOpen] = useState(false);
  const [platform, setPlatform] = useState<Platform>("other");

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as unknown as { standalone?: boolean }).standalone === true;
    if (standalone) return; // already installed → show nothing, ever

    setVisible(true);

    const ua = navigator.userAgent;
    const isIOS = /iphone|ipad|ipod/i.test(ua) ||
      ((navigator as any).platform === "MacIntel" && navigator.maxTouchPoints > 1); // iPadOS
    const isAndroid = /android/i.test(ua);
    setPlatform(isIOS ? "ios" : isAndroid ? "android" : window.matchMedia("(pointer: fine)").matches ? "desktop" : "other");

    const onBIP = (e: Event) => { e.preventDefault(); setDeferred(e as BIPEvent); };
    window.addEventListener("beforeinstallprompt", onBIP);
    const onInstalled = () => { setVisible(false); setOpen(false); };
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBIP);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  async function nativeInstall() {
    if (!deferred) return;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    setDeferred(null);
    if (outcome === "accepted") { setVisible(false); setOpen(false); }
  }

  if (!visible) return null;

  return (
    <>
      {/* Persistent standby button — bottom-left, clear of the WhatsApp/assistant buttons */}
      <button onClick={() => setOpen(true)} aria-label="Get the D-Maths app"
        className="fixed bottom-24 left-4 z-[70] flex items-center gap-2 rounded-full bg-board px-4 py-2.5 text-sm font-bold text-white shadow-xl ring-1 ring-white/10 transition hover:scale-105 active:scale-95 lg:bottom-5">
        <Icon name="download" className="h-4 w-4" />
        <span>Get the app</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-[90] flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label="Install the D-Maths app">
          <button aria-label="Close" onClick={() => setOpen(false)} className="absolute inset-0 bg-board/50 backdrop-blur-sm" />
          <div className="relative z-10 w-full max-w-md rounded-t-3xl bg-white p-6 shadow-2xl sm:rounded-3xl">
            <div className="flex items-start gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gold-pale text-gold-deep">
                <Icon name="download" className="h-5 w-5" />
              </span>
              <div className="flex-1">
                <h2 className="font-display text-lg font-bold">Install the D-Maths app</h2>
                <p className="text-sm text-ink/55">One-tap access, class reminders &amp; notifications — installs straight from your browser, no app store needed.</p>
              </div>
              <button onClick={() => setOpen(false)} aria-label="Close" className="text-ink/35 hover:text-ink">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
              </button>
            </div>

            <div className="mt-5">
              {deferred ? (
                <button onClick={nativeInstall} className="btn-gold w-full !min-h-[50px] !rounded-2xl !text-base">
                  Install now
                </button>
              ) : platform === "ios" ? (
                <ol className="space-y-3 text-sm text-ink/70">
                  <li className="flex items-center gap-3"><Step n={1} /> <span>Tap the <Icon name="share" className="mx-0.5 inline h-4 w-4" /> <strong>Share</strong> button in Safari's toolbar.</span></li>
                  <li className="flex items-center gap-3"><Step n={2} /> <span>Choose <Icon name="plusSquare" className="mx-0.5 inline h-4 w-4" /> <strong>Add to Home Screen</strong>.</span></li>
                  <li className="flex items-center gap-3"><Step n={3} /> <span>Tap <strong>Add</strong> — the D-Maths icon appears on your home screen.</span></li>
                </ol>
              ) : platform === "android" ? (
                <ol className="space-y-3 text-sm text-ink/70">
                  <li className="flex items-center gap-3"><Step n={1} /> <span>Open your browser's <strong>⋮ menu</strong> (top right).</span></li>
                  <li className="flex items-center gap-3"><Step n={2} /> <span>Tap <strong>Install app</strong> (or <strong>Add to Home screen</strong>).</span></li>
                  <li className="flex items-center gap-3"><Step n={3} /> <span>Confirm — the app installs to your home screen.</span></li>
                </ol>
              ) : (
                <ol className="space-y-3 text-sm text-ink/70">
                  <li className="flex items-center gap-3"><Step n={1} /> <span>Look for the <strong>install icon</strong> in your browser's address bar.</span></li>
                  <li className="flex items-center gap-3"><Step n={2} /> <span>Or open the <strong>⋮ menu</strong> → <strong>Install D-Maths…</strong></span></li>
                  <li className="flex items-center gap-3"><Step n={3} /> <span>Confirm to add it as an app.</span></li>
                </ol>
              )}
            </div>

            <p className="mt-4 text-center text-[11px] text-ink/40">On iPhone this works in Safari; on Android in Chrome.</p>
          </div>
        </div>
      )}
    </>
  );
}

function Step({ n }: { n: number }) {
  return <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-gold font-display text-xs font-bold text-white">{n}</span>;
}
