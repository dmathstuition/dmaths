"use client";
import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/Icons";

// A PERSISTENT "Get the app" button. It stays on screen until the app is
// actually installed — never permanently dismissible — and works on every
// platform, not just when Chrome happens to fire beforeinstallprompt:
//  • Android/Chrome/Edge/desktop → native one-tap install when available,
//    otherwise clear browser-menu steps.
//  • iPhone/iPad (Safari) → Share → "Add to Home Screen" steps (iOS has no
//    programmatic install).
// It is draggable (drag to reposition; the spot is remembered), and only ever
// shows to people who have NOT installed the app.
type BIPEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};
type Platform = "android" | "ios" | "desktop" | "other";

const INSTALLED_KEY = "dmaths-installed";
const POS_KEY = "dmaths-app-btn-pos";

export default function InstallPrompt() {
  const [deferred, setDeferred] = useState<BIPEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [open, setOpen] = useState(false);
  const [platform, setPlatform] = useState<Platform>("other");
  // null = default corner (Tailwind classes); otherwise a dragged pixel position.
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);

  const btnRef = useRef<HTMLButtonElement>(null);
  const drag = useRef<{ dx: number; dy: number; moved: boolean } | null>(null);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as unknown as { standalone?: boolean }).standalone === true;
    if (standalone) return;                                   // running installed → never show
    if (localStorage.getItem(INSTALLED_KEY) === "1") return;  // installed before, now in a tab

    // Chromium: if a related PWA/TWA is already installed, stay hidden too.
    const gira = (navigator as any).getInstalledRelatedApps;
    if (typeof gira === "function") {
      gira.call(navigator).then((apps: unknown[]) => {
        if (apps && apps.length) { localStorage.setItem(INSTALLED_KEY, "1"); setVisible(false); }
      }).catch(() => {});
    }

    // Restore a remembered drag position (clamped to the current viewport).
    try {
      const saved = JSON.parse(localStorage.getItem(POS_KEY) || "null");
      if (saved && typeof saved.x === "number" && typeof saved.y === "number") {
        setPos({
          x: Math.min(Math.max(8, saved.x), window.innerWidth - 60),
          y: Math.min(Math.max(8, saved.y), window.innerHeight - 60),
        });
      }
    } catch { /* ignore */ }

    setVisible(true);

    const ua = navigator.userAgent;
    const isIOS = /iphone|ipad|ipod/i.test(ua) ||
      ((navigator as any).platform === "MacIntel" && navigator.maxTouchPoints > 1); // iPadOS
    const isAndroid = /android/i.test(ua);
    setPlatform(isIOS ? "ios" : isAndroid ? "android" : window.matchMedia("(pointer: fine)").matches ? "desktop" : "other");

    const onBIP = (e: Event) => { e.preventDefault(); setDeferred(e as BIPEvent); };
    window.addEventListener("beforeinstallprompt", onBIP);
    const onInstalled = () => { localStorage.setItem(INSTALLED_KEY, "1"); setVisible(false); setOpen(false); };
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBIP);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  // ── Drag to reposition (pointer events; a plain tap still opens the sheet) ──
  function onPointerDown(e: React.PointerEvent<HTMLButtonElement>) {
    const rect = btnRef.current!.getBoundingClientRect();
    drag.current = { dx: e.clientX - rect.left, dy: e.clientY - rect.top, moved: false };
    if (pos === null) setPos({ x: rect.left, y: rect.top }); // seed from current spot
    btnRef.current!.setPointerCapture(e.pointerId);
  }
  function onPointerMove(e: React.PointerEvent<HTMLButtonElement>) {
    const d = drag.current;
    if (!d) return;
    const w = btnRef.current!.offsetWidth, h = btnRef.current!.offsetHeight;
    const x = Math.min(Math.max(8, e.clientX - d.dx), window.innerWidth - w - 8);
    const y = Math.min(Math.max(8, e.clientY - d.dy), window.innerHeight - h - 8);
    // Any real pointer travel turns this from a "tap" into a "drag".
    if (Math.abs(e.movementX) + Math.abs(e.movementY) > 0) d.moved = true;
    setPos({ x, y });
  }
  function onPointerUp(e: React.PointerEvent<HTMLButtonElement>) {
    const d = drag.current;
    drag.current = null;
    try { btnRef.current!.releasePointerCapture(e.pointerId); } catch { /* ignore */ }
    if (!d) return;
    if (d.moved && pos) {
      try { localStorage.setItem(POS_KEY, JSON.stringify(pos)); } catch { /* ignore */ }
    } else {
      setOpen(true); // it was a tap, not a drag
    }
  }

  async function nativeInstall() {
    if (!deferred) return;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    setDeferred(null);
    if (outcome === "accepted") { localStorage.setItem(INSTALLED_KEY, "1"); setVisible(false); setOpen(false); }
  }

  if (!visible) return null;

  return (
    <>
      {/* Persistent standby button — draggable; default sits bottom-left, clear
          of the WhatsApp/assistant buttons. */}
      <button ref={btnRef}
        onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp}
        aria-label="Get the D-Maths app — drag to move, tap to install"
        style={pos ? { left: pos.x, top: pos.y, right: "auto", bottom: "auto", touchAction: "none" } : { touchAction: "none" }}
        className={`fixed z-[70] flex touch-none cursor-grab select-none items-center gap-2 rounded-full bg-board px-4 py-2.5 text-sm font-bold text-white shadow-xl ring-1 ring-white/10 transition active:scale-95 active:cursor-grabbing ${
          pos ? "" : "bottom-24 left-4 lg:bottom-5"
        }`}>
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
