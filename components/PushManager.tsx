"use client";
import { useEffect, useState } from "react";

const DISMISS_KEY = "dmaths-push-dismissed";
const VAPID = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

// base64url → Uint8Array (applicationServerKey format the browser expects).
function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

async function subscribe(): Promise<boolean> {
  if (!VAPID) return false;
  const reg = await navigator.serviceWorker.ready;
  const existing = await reg.pushManager.getSubscription();
  const sub =
    existing ??
    (await reg.pushManager.subscribe({
      userVisibleOnly: true,
      // Cast: lib.dom's BufferSource is generic over ArrayBuffer; our
      // Uint8Array is structurally a valid application server key.
      applicationServerKey: urlBase64ToUint8Array(VAPID) as unknown as BufferSource,
    }));
  const res = await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(sub),
  });
  return res.ok;
}

// Quietly keeps the user's push subscription registered, and shows a small
// one-time prompt to turn notifications on. Safe to mount on every
// authenticated page — it no-ops where push isn't supported.
export default function PushManager() {
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const supported =
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      "Notification" in window;
    if (!supported || !VAPID) return;

    if (Notification.permission === "granted") {
      // Already allowed — make sure the (possibly new) device is registered.
      subscribe().catch(() => {});
      return;
    }
    if (Notification.permission === "denied") return; // can't re-ask
    if (localStorage.getItem(DISMISS_KEY) === "1") return;
    setShow(true);
  }, []);

  async function enable() {
    setBusy(true);
    try {
      const perm = await Notification.requestPermission();
      if (perm === "granted") await subscribe();
    } catch {
      /* ignore */
    } finally {
      localStorage.setItem(DISMISS_KEY, "1");
      setBusy(false);
      setShow(false);
    }
  }

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, "1");
    setShow(false);
  }

  if (!show) return null;

  return (
    <div className="fixed inset-x-3 bottom-4 z-50 mx-auto max-w-sm sm:left-auto sm:right-6">
      <div className="glass-card flex items-start gap-3 p-4 shadow-2xl">
        <span className="text-2xl" aria-hidden="true">🔔</span>
        <div className="min-w-0 flex-1">
          <p className="font-display text-sm font-bold text-ink dark:text-white">Turn on notifications</p>
          <p className="mt-0.5 text-[13px] leading-relaxed text-ink/60 dark:text-white/55">
            Get class reminders, new grades and updates — even when the app is closed.
          </p>
          <div className="mt-3 flex items-center gap-2">
            <button onClick={enable} disabled={busy}
              className="btn-gold !min-h-[38px] !rounded-full !px-4 !text-[13px]">
              {busy ? "Enabling…" : "Enable"}
            </button>
            <button onClick={dismiss} className="text-[13px] font-semibold text-ink/45 hover:text-ink/70 dark:text-white/40">
              Not now
            </button>
          </div>
        </div>
        <button onClick={dismiss} aria-label="Dismiss"
          className="flex-shrink-0 text-ink/35 transition hover:text-ink/70 dark:text-white/40">
          ✕
        </button>
      </div>
    </div>
  );
}
