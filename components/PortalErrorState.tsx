"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/Icons";

// The designed fallback shown inside a portal when a page fails to render — a
// dropped connection, or a genuine error. It renders within the portal shell
// (so the nav stays), tells the two apart, and offers a way forward. Used by the
// role error.tsx boundaries and by components/ErrorBoundary.
export default function PortalErrorState({
  reset, home = "/portal", homeLabel = "Back to dashboard",
}: {
  reset?: () => void;
  home?: string;
  homeLabel?: string;
}) {
  // Decide offline vs error on the client, and auto-recover the moment the
  // connection returns if the failure was just the network.
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    setOffline(!navigator.onLine);
    const on = () => { setOffline(false); reset?.(); };
    const off = () => setOffline(true);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex min-h-[55vh] flex-col items-center justify-center px-4 py-12 text-center">
      <div className="card flex max-w-md flex-col items-center gap-4 p-8">
        <span className={`flex h-16 w-16 items-center justify-center rounded-2xl ${
          offline ? "bg-gold-pale text-gold-deep" : "bg-red-50 text-red-500"}`}>
          {offline
            ? <WifiOff className="h-8 w-8" />
            : <Icon name="alertTriangle" className="h-8 w-8" />}
        </span>

        <div>
          <h1 className="font-display text-xl font-bold text-ink">
            {offline ? "You're offline" : "Something went wrong"}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-ink/55">
            {offline
              ? "This page needs a connection to load. Check your network — it'll come back on its own as soon as you're reconnected."
              : "We couldn't load this page. It's not your fault — try again, and if it keeps happening let us know."}
          </p>
        </div>

        <div className="mt-1 flex flex-wrap items-center justify-center gap-2">
          {reset && (
            <button onClick={reset} className="btn-gold !rounded-full !px-6">Try again</button>
          )}
          <Link href={home} className="btn !rounded-full border border-line bg-white !px-6 text-ink hover:bg-chalk">
            {homeLabel}
          </Link>
        </div>

        {!offline && (
          <a href="mailto:dmathstuition@gmail.com" className="text-[12px] font-semibold text-ink/40 hover:text-ink/70">
            Contact support
          </a>
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
