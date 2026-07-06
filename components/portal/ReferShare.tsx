"use client";
import { useState } from "react";
import { Icon } from "@/components/Icons";

// Student-facing share widget: shows the referral link, a Copy button, and a
// native Share button where supported. `link` is built server-side from the
// canonical site URL so it's always correct even before hydration.
export default function ReferShare({ link }: { link: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked — the field is selectable as a fallback */
    }
  }

  async function share() {
    const nav = navigator as unknown as { share?: (d: { title: string; text: string; url: string }) => Promise<void> };
    if (nav.share) {
      try {
        await nav.share({
          title: "Join me at D-Maths",
          text: "I learn maths, science & coding with D-Maths — join with my link and enrol:",
          url: link,
        });
      } catch { /* user dismissed the share sheet */ }
    } else {
      copy();
    }
  }

  const canShare = typeof navigator !== "undefined" && "share" in navigator;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 rounded-xl border border-line bg-chalk/50 p-2">
        <input
          readOnly
          value={link}
          onFocus={(e) => e.currentTarget.select()}
          className="min-w-0 flex-1 bg-transparent px-2 text-sm font-mono text-ink/70 outline-none"
          aria-label="Your referral link"
        />
        <button onClick={copy} className="btn-ink !min-h-[40px] shrink-0 !px-4 !text-sm">
          {copied ? "Copied ✓" : "Copy"}
        </button>
      </div>
      <button onClick={share} className="btn-gold flex w-full items-center justify-center gap-2 !min-h-[48px]">
        <Icon name="messages" className="h-4 w-4" />
        {canShare ? "Share your link" : "Copy your link"}
      </button>
    </div>
  );
}
