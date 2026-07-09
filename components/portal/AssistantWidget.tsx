"use client";
import { useEffect, useRef, useState } from "react";
import { useAssistantTask } from "@/components/portal/AssistantContext";

type Msg = { role: "user" | "assistant"; content: string };

const LEARNER_GREETING =
  "Hi, I'm Dexter — your learning buddy! 🧭 Stuck on some maths, English or code? Tell me what you're working on and I'll help you figure it out (I give hints, not the finished answer 😉).";
const STAFF_GREETING =
  "Hi, I'm Dexter — your teaching assistant. 🧭 Ask me for worked solutions, lesson ideas, practice questions, marking help, or a concept explained a few ways.";

// A floating AI chat. In "learner" mode (default) it gives hints — never the full
// answer — so it never does a learner's graded work for them. In "staff" mode
// (tutors/admin) it's a teaching assistant that can give complete answers; the API
// re-checks the caller's role before granting that. `context` (optional, or the
// AssistantContext task) lets a page pass the current task so replies are on-topic.
export default function AssistantWidget({ context, mode = "learner" }: { context?: string; mode?: "learner" | "staff" }) {
  const staff = mode === "staff";
  const greeting: Msg = { role: "assistant", content: staff ? STAFF_GREETING : LEARNER_GREETING };
  const { task } = useAssistantTask();
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([greeting]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [msgs, busy, open]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 150);
  }, [open]);

  async function send() {
    const text = input.trim();
    if (!text || busy) return;
    const next = [...msgs, { role: "user" as const, content: text }];
    setMsgs(next);
    setInput("");
    setBusy(true);
    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Drop the canned greeting (always the first message) from what we send.
        body: JSON.stringify({ messages: next.slice(1), context: context ?? task, mode }),
      });
      const json = await res.json().catch(() => ({}));
      const reply = res.ok
        ? json.reply
        : json.error || "Sorry, something went wrong. Please try again.";
      setMsgs((m) => [...m, { role: "assistant", content: reply }]);
    } catch {
      setMsgs((m) => [...m, { role: "assistant", content: "I couldn't reach the server. Check your connection and try again." }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {/* Launcher — sits above the mobile tab bar */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label="Open the learning buddy"
          className="fixed bottom-24 right-4 z-[60] flex h-14 w-14 items-center justify-center rounded-full bg-gold text-2xl shadow-xl shadow-gold/40 transition hover:scale-105 active:scale-95 lg:bottom-6 lg:right-6"
        >
          <span>🧭</span>
          <span className="absolute -right-0.5 -top-0.5 flex h-3.5 w-3.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-70" />
            <span className="relative inline-flex h-3.5 w-3.5 rounded-full bg-emerald-500" />
          </span>
        </button>
      )}

      {/* Panel */}
      {open && (
        <div className="fixed inset-x-3 bottom-24 z-[60] flex max-h-[70vh] flex-col overflow-hidden rounded-3xl border border-line bg-white shadow-2xl sm:inset-x-auto sm:right-6 sm:w-[380px] lg:bottom-6">
          {/* Header */}
          <div className="flex items-center gap-3 bg-board px-4 py-3 text-white">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gold text-lg">🧭</span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold leading-tight">Dexter · {staff ? "Teaching assistant" : "Learning buddy"}</p>
              <p className="text-[11px] text-white/55">{staff ? "Solutions, lesson ideas & marking help" : "Hints to help you — not the answers"}</p>
            </div>
            <button onClick={() => setOpen(false)} aria-label="Close" className="rounded-lg p-1.5 text-white/70 hover:bg-white/10 hover:text-white">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
            </button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto bg-chalk/40 px-3 py-4">
            {msgs.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2 text-[13.5px] leading-relaxed ${
                    m.role === "user"
                      ? "rounded-br-sm bg-gold text-board"
                      : "rounded-bl-sm bg-white text-ink shadow-sm"
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {busy && (
              <div className="flex justify-start">
                <div className="flex gap-1 rounded-2xl rounded-bl-sm bg-white px-3.5 py-3 shadow-sm">
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-ink/40 [animation-delay:-0.3s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-ink/40 [animation-delay:-0.15s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-ink/40" />
                </div>
              </div>
            )}
          </div>

          {/* Composer */}
          <div className="flex items-center gap-2 border-t border-line bg-white p-2.5">
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder="Ask me anything about your work…"
              maxLength={2000}
              className="min-w-0 flex-1 rounded-full border border-line bg-chalk/50 px-4 py-2.5 text-sm outline-none focus:border-gold"
            />
            <button
              onClick={send}
              disabled={busy || !input.trim()}
              aria-label="Send"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gold text-board transition disabled:opacity-40"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" /></svg>
            </button>
          </div>
        </div>
      )}
    </>
  );
}
