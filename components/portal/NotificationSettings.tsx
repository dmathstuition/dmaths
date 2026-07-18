"use client";
import { useEffect, useState } from "react";
import { Icon } from "@/components/Icons";
import { useToast } from "@/components/Toast";
import { pushSupported, subscribeToPush } from "@/lib/push";

type State = "loading" | "unsupported" | "default" | "granted" | "denied";

// Lets a learner turn class/grade/message notifications on from their profile,
// and shows the current state clearly. Complements the one-time PushManager
// prompt — this is the durable control users can come back to.
export default function NotificationSettings() {
  const push = useToast();
  const [state, setState] = useState<State>("loading");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!pushSupported()) { setState("unsupported"); return; }
    setState(Notification.permission as State);
  }, []);

  async function enable() {
    setBusy(true);
    try {
      const perm = await Notification.requestPermission();
      setState(perm as State);
      if (perm === "granted") {
        const ok = await subscribeToPush();
        push(ok ? "Notifications are on." : "Turned on, but couldn't register this device — try again.",
          ok ? "success" : "error");
      } else if (perm === "denied") {
        push("Notifications blocked. Enable them in your browser/device settings.", "error");
      }
    } catch {
      push("Something went wrong turning on notifications.", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card p-6">
      <h2 className="mb-1 font-display text-lg font-semibold">Notifications</h2>
      <p className="mb-4 text-[13px] text-ink/55">
        Class reminders, new grades and messages — even when the app is closed.
      </p>

      {state === "loading" && (
        <div className="h-9 w-40 animate-pulse rounded-full bg-line/70" />
      )}

      {state === "unsupported" && (
        <div className="flex items-start gap-3 rounded-xl bg-chalk px-4 py-3 text-[13px] text-ink/60">
          <Icon name="alertTriangle" className="mt-0.5 h-4 w-4 flex-shrink-0 text-ink/40" />
          <p>
            This device or browser doesn&apos;t support push notifications. Install the app to your home screen, or use
            Chrome / Edge / Safari to enable them.
          </p>
        </div>
      )}

      {state === "granted" && (
        <div className="flex items-center gap-2.5 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
          <Icon name="bell" className="h-4 w-4" /> Notifications are on for this device.
        </div>
      )}

      {state === "default" && (
        <button onClick={enable} disabled={busy} className="btn-gold inline-flex items-center gap-2">
          <Icon name="bell" className="h-4 w-4" />
          {busy ? "Enabling…" : "Turn on notifications"}
        </button>
      )}

      {state === "denied" && (
        <div className="flex items-start gap-3 rounded-xl bg-red-50 px-4 py-3 text-[13px] text-red-700/90">
          <Icon name="bellOff" className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <p>
            Notifications are blocked. To turn them back on, open your browser or device site settings for this app and
            allow notifications, then reload.
          </p>
        </div>
      )}
    </div>
  );
}
