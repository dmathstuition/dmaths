"use client";
import { useEffect, useRef, useState } from "react";
import { PACKAGES, packageRate } from "@/lib/packages";
import { fmtNgn } from "@/lib/pricing";
import { FAQS as FAQ_SOURCE } from "@/lib/faq";

type Msg = { role: "bot" | "user"; text: string };

const WHATSAPP = "https://wa.me/2347025674894";
const GREETING = "Hi! 👋 I'm the D-Maths assistant. Ask me anything about enrolling, subjects, pricing or how it all works — or pick a question below.";

// The shared FAQ powers the quick-question buttons (instant answers, no AI
// round-trip). The pricing answer gets the live per-hour rates appended.
const PRICE_LINE = PACKAGES.map(p => `${p.name.replace(/^Tier \d+ — /, "")} — ${fmtNgn(packageRate(p))}/hr`).join("; ");
const FAQS = FAQ_SOURCE.map(f => ({
  q: f.q,
  a: f.id === "pricing" ? `Tuition is charged per hour: ${PRICE_LINE}. See the Pricing page for full details.` : f.a,
}));

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<"home" | "chat">("home");
  const [msgs, setMsgs] = useState<Msg[]>([{ role: "bot", text: GREETING }]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (view === "chat") bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs, view, busy]);

  async function ask(text: string, canned?: string) {
    const q = text.trim();
    if (!q || busy) return;
    setView("chat");
    const history = msgs.map(m => ({ role: m.role, text: m.text }));
    setMsgs(m => [...m, { role: "user", text: q }]);
    setInput("");
    if (canned) { setMsgs(m => [...m, { role: "bot", text: canned }]); return; }
    setBusy(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: q, history }),
      });
      const j = await res.json().catch(() => ({}));
      setMsgs(m => [...m, { role: "bot", text: j.reply || "Sorry — please try again, or reach us on WhatsApp." }]);
    } catch {
      setMsgs(m => [...m, { role: "bot", text: "I couldn't reach the server. Please try WhatsApp for a quick reply." }]);
    } finally { setBusy(false); }
  }

  return (
    <>
      {/* Launcher */}
      <button onClick={() => setOpen(o => !o)} aria-label={open ? "Close chat" : "Open chat"}
        className="fixed bottom-5 right-5 z-[60] flex h-14 w-14 items-center justify-center rounded-full bg-board text-white shadow-xl ring-1 ring-black/10 transition hover:scale-105 active:scale-95">
        {open ? (
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
        ) : (
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
        )}
      </button>

      {open && (
        <div className="fixed bottom-24 right-5 z-[60] flex h-[560px] max-h-[calc(100vh-7rem)] w-[370px] max-w-[calc(100vw-2.5rem)] flex-col overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-black/10">
          {/* Header */}
          <div className="flex items-center gap-3 bg-board px-5 py-4 text-white">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gold/20 font-display text-sm font-extrabold text-gold ring-1 ring-gold/30">DM</span>
            <div className="min-w-0 flex-1">
              <p className="font-display text-base font-bold leading-tight">D-Maths</p>
              <p className="flex items-center gap-1.5 text-[11px] text-white/60">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Online now
              </p>
            </div>
            {view === "chat" && (
              <button onClick={() => setView("home")} className="rounded-lg px-2 py-1 text-xs font-semibold text-white/70 hover:bg-white/10">Home</button>
            )}
            <button onClick={() => setOpen(false)} aria-label="Close" className="rounded-lg p-1.5 text-white/70 hover:bg-white/10">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
            </button>
          </div>

          {view === "home" ? (
            <div className="flex-1 overflow-y-auto bg-chalk/40 p-4">
              <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-line">
                <p className="text-[15px] font-semibold text-ink">Hi, how can we help?</p>
                <p className="mt-1 text-[13px] text-ink/55">Ask a question or pick one below.</p>
                <button onClick={() => { setView("chat"); }}
                  className="mt-3 flex w-full items-center justify-between rounded-xl bg-board px-4 py-3 text-sm font-bold text-white transition hover:opacity-95">
                  Start a chat
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
                </button>
              </div>

              <div className="mt-4 rounded-2xl bg-white shadow-sm ring-1 ring-line">
                <p className="border-b border-line px-4 py-3 text-[13px] font-bold text-ink/70">Frequently asked</p>
                {FAQS.map((f) => (
                  <button key={f.q} onClick={() => ask(f.q, f.a)}
                    className="flex w-full items-center justify-between gap-3 border-b border-line/60 px-4 py-3 text-left text-[13.5px] text-ink/75 transition last:border-0 hover:bg-chalk">
                    {f.q}
                    <span className="text-ink/30">›</span>
                  </button>
                ))}
              </div>

              <a href={WHATSAPP} target="_blank" rel="noopener noreferrer"
                className="mt-4 flex items-center justify-center gap-2 rounded-xl border border-line bg-white px-4 py-3 text-sm font-bold text-ink/70 hover:bg-chalk">
                <span className="h-2 w-2 rounded-full" style={{ background: "#25D366" }} /> Chat on WhatsApp
              </a>
            </div>
          ) : (
            <>
              <div ref={bodyRef} className="flex-1 space-y-3 overflow-y-auto bg-chalk/40 p-4">
                {msgs.map((m, i) => (
                  <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[80%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-[13.5px] leading-relaxed ${
                      m.role === "user" ? "rounded-br-md bg-board text-white" : "rounded-bl-md bg-white text-ink/80 ring-1 ring-line"}`}>
                      {m.text}
                    </div>
                  </div>
                ))}
                {busy && (
                  <div className="flex justify-start">
                    <div className="rounded-2xl rounded-bl-md bg-white px-4 py-3 ring-1 ring-line">
                      <span className="flex gap-1">
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-ink/30 [animation-delay:-0.2s]" />
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-ink/30 [animation-delay:-0.1s]" />
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-ink/30" />
                      </span>
                    </div>
                  </div>
                )}
              </div>
              <form onSubmit={(e) => { e.preventDefault(); ask(input); }}
                className="flex items-center gap-2 border-t border-line bg-white p-3">
                <input value={input} onChange={e => setInput(e.target.value)} placeholder="Type your message…"
                  className="min-w-0 flex-1 rounded-full border border-line bg-chalk/50 px-4 py-2.5 text-sm text-ink outline-none focus:border-gold/60" />
                <button type="submit" disabled={busy || !input.trim()} aria-label="Send"
                  className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-board text-white transition hover:opacity-95 disabled:opacity-40">
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7Z" /></svg>
                </button>
              </form>
            </>
          )}

          <p className="bg-white pb-2 text-center text-[10px] text-ink/30">Powered by D-Maths · replies are guidance, not a contract</p>
        </div>
      )}
    </>
  );
}
