"use client";
import { useState } from "react";
import { isEmail } from "@/lib/blog";

// Where visitors register their email to receive blog updates. Public, used on
// the blog index (and reusable elsewhere). POSTs to the rate-limited subscribe
// route; shows a friendly confirmation.
export default function NewsletterSignup({ compact = false }: { compact?: boolean }) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");
  const [msg, setMsg] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!isEmail(email)) { setState("error"); setMsg("Please enter a valid email address."); return; }
    setState("busy");
    try {
      const res = await fetch("/api/blog/subscribe", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) { setState("error"); setMsg(json.error || "Something went wrong — please try again."); return; }
      setState("done"); setMsg(json.message || "You're on the list — thank you!"); setEmail("");
    } catch {
      setState("error"); setMsg("Network error — please try again.");
    }
  }

  if (state === "done") {
    return (
      <div className={`flex items-center gap-3 rounded-2xl border border-gold/40 bg-gold/10 px-5 py-4 ${compact ? "" : "mx-auto max-w-md"}`}>
        <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gold text-white">
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
        </span>
        <p className="text-sm font-semibold text-ink/75">{msg}</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className={compact ? "" : "mx-auto max-w-md"}>
      <div className="flex flex-col gap-2.5 sm:flex-row">
        <input
          type="email" inputMode="email" autoComplete="email" placeholder="you@example.com"
          value={email} onChange={(e) => { setEmail(e.target.value); if (state === "error") setState("idle"); }}
          className="min-h-[48px] flex-1 rounded-full border border-line bg-white px-5 text-sm text-ink outline-none transition focus:border-gold focus:ring-2 focus:ring-gold/30"
          aria-label="Your email address"
        />
        <button type="submit" disabled={state === "busy"}
          className="btn-gold !min-h-[48px] !rounded-full !px-7 disabled:opacity-60">
          {state === "busy" ? "Signing up…" : "Subscribe"}
        </button>
      </div>
      {state === "error" && <p className="mt-2 text-[13px] font-semibold text-red-600">{msg}</p>}
      <p className="mt-2 text-[12px] text-ink/45">New posts and study tips, straight to your inbox. Unsubscribe any time.</p>
    </form>
  );
}
