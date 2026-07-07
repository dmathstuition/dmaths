"use client";
import { startTourEvent } from "@/components/tour/Tour";

// Small pill that (re)launches the on-page tour. The Tour component listens for
// the `dmaths:start-tour` event, so this stays decoupled from where Tour mounts.
export default function TourButton({ light = false, className = "" }: { light?: boolean; className?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event(startTourEvent))}
      aria-label="Take a tour"
      title="Take a tour"
      className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition ${
        light
          ? "bg-white/10 text-white/70 hover:bg-white/20 hover:text-white"
          : "bg-gold-pale text-gold-deep hover:bg-gold/20"
      } ${className}`}
    >
      <span aria-hidden="true">🧭</span>
      <span className="hidden sm:inline">Tour</span>
    </button>
  );
}
