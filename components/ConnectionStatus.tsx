"use client";
import { useEffect, useState } from "react";

// A live connection indicator for the portal shells. When the connection drops
// mid-session it slides in a calm amber bar ("you're offline"); when it returns
// it flashes a green "back online" and hides itself. Purely presentational — the
// pages themselves decide what to do with the network — but it stops a learner
// wondering why nothing is loading.
export default function ConnectionStatus() {
  // "online" while connected; "offline" when dropped; "recovered" briefly on return.
  const [state, setState] = useState<"online" | "offline" | "recovered">("online");

  useEffect(() => {
    let hideTimer: ReturnType<typeof setTimeout> | undefined;

    const goOffline = () => { clearTimeout(hideTimer); setState("offline"); };
    const goOnline = () => {
      // Only celebrate a reconnection if we were actually offline.
      setState((prev) => (prev === "offline" ? "recovered" : "online"));
      hideTimer = setTimeout(() => setState("online"), 3000);
    };

    if (!navigator.onLine) setState("offline");
    window.addEventListener("offline", goOffline);
    window.addEventListener("online", goOnline);
    return () => {
      clearTimeout(hideTimer);
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("online", goOnline);
    };
  }, []);

  if (state === "online") return null;

  const offline = state === "offline";

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-20 z-[60] flex justify-center px-4 lg:bottom-5"
    >
      <div
        className={`pointer-events-auto flex items-center gap-2.5 rounded-full px-4 py-2.5 text-[13px] font-semibold shadow-xl ring-1 transition-all duration-300 ${
          offline
            ? "bg-board text-white ring-white/10"
            : "bg-emerald-600 text-white ring-emerald-400/30"
        }`}
        style={{ animation: "revealUp .25s ease-out" }}
      >
        {offline ? (
          <>
            <WifiOff className="h-4 w-4 flex-shrink-0 text-gold" />
            <span>You&apos;re offline — we&apos;ll reconnect automatically.</span>
          </>
        ) : (
          <>
            <span className="flex h-4 w-4 flex-shrink-0 items-center justify-center">
              <span className="h-2 w-2 rounded-full bg-white" />
            </span>
            <span>Back online</span>
          </>
        )}
      </div>
    </div>
  );
}

function WifiOff({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M1 1l22 22" />
      <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" />
      <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" />
      <path d="M10.71 5.05A16 16 0 0 1 22.58 9" />
      <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" />
      <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
      <line x1="12" y1="20" x2="12.01" y2="20" />
    </svg>
  );
}
