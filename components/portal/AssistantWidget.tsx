"use client";
import { useEffect, useRef, useState } from "react";
import { useAssistantTask } from "@/components/portal/AssistantContext";
import { Icon } from "@/components/Icons";

type Msg = { role: "user" | "assistant"; content: string };

const LEARNER_GREETING =
  "Hi, I'm D-Maths A.I — your learning buddy! 🧭 Stuck on some maths, English or code? Tell me what you're working on and I'll help you figure it out (I give hints, not the finished answer 😉).";
const STAFF_GREETING =
  "Hi, I'm D-Maths A.I — your teaching assistant. 🧭 Ask me for worked solutions, lesson ideas, practice questions, marking help, or a concept explained a few ways.";

// Render an assistant reply with light formatting: ```fenced``` code as a block,
// `inline code` as a chip, and **bold** as bold. Any stray ** markers that slip
// through are stripped so they never show as literal asterisks. Newlines are
// preserved by the bubble's whitespace-pre-wrap.
function inline(t: string, keyBase: number): React.ReactNode {
  return t.split(/(`[^`]+`|\*\*[^*]+\*\*)/g).map((p, i) => {
    if (p.length > 1 && p.startsWith("`") && p.endsWith("`")) {
      return <code key={`${keyBase}-${i}`} className="rounded bg-ink/10 px-1 py-0.5 font-mono text-[12px]">{p.slice(1, -1)}</code>;
    }
    if (p.length > 3 && p.startsWith("**") && p.endsWith("**")) {
      return <strong key={`${keyBase}-${i}`} className="font-bold">{p.slice(2, -2)}</strong>;
    }
    // Strip any orphan ** / __ markers left in plain prose.
    return <span key={`${keyBase}-${i}`}>{p.replace(/\*\*|__/g, "")}</span>;
  });
}
function formatMessage(text: string): React.ReactNode {
  const out: React.ReactNode[] = [];
  const re = /```(?:[a-zA-Z]+)?\n?([\s\S]*?)```/g;
  let last = 0, m: RegExpExecArray | null, k = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(<span key={k++}>{inline(text.slice(last, m.index), k)}</span>);
    out.push(
      <pre key={k++} className="my-1.5 overflow-auto rounded-lg bg-[#0b2036] p-2.5 font-mono text-[12px] leading-relaxed text-slate-100">
        {m[1].replace(/\n$/, "")}
      </pre>,
    );
    last = re.lastIndex;
  }
  if (last < text.length) out.push(<span key={k++}>{inline(text.slice(last), k)}</span>);
  return out;
}

// A floating AI chat. In "learner" mode (default) it gives hints — never the full
// answer — so it never does a learner's graded work for them. In "staff" mode
// (tutors/admin) it's a teaching assistant that can give complete answers; the API
// re-checks the caller's role before granting that. `context` (optional, or the
// AssistantContext task) lets a page pass the current task so replies are on-topic.
export default function AssistantWidget({ context, mode = "learner" }: { context?: string; mode?: "learner" | "staff" }) {
  const staff = mode === "staff";
  const greeting: Msg = { role: "assistant", content: staff ? STAFF_GREETING : LEARNER_GREETING };
  const { task, draft, open, setOpen } = useAssistantTask();
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

  // Conversation-starter chips, shown before the first question. They adapt to the
  // mode and to whether the user opened the assistant from the code editor (has draft code).
  const chips = staff
    ? ["Give me a worked solution", "Make a practice set", "Mark a learner's answer", "Explain it three ways"]
    : draft
      ? ["Explain this error", "What's wrong with my code?", "Give me a hint 🧭", "What's the next step?"]
      : ["Give me a hint 🧭", "Explain this concept", "Where do I start?", "Check my thinking"];

  async function send(prefill?: string) {
    const text = (prefill ?? input).trim();
    if (!text || busy) return;
    const next = [...msgs, { role: "user" as const, content: text }];
    setMsgs(next);
    if (!prefill) setInput("");
    setBusy(true);
    // Assemble the context: the page's task, plus the editor code if they asked
    // from inside the IDE.
    const parts: string[] = [];
    const base = context ?? task;
    if (base) parts.push(base);
    if (draft) parts.push(`The user's current code in the editor:\n${draft}`);
    const ctx = parts.join("\n\n") || undefined;
    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Drop the canned greeting (always the first message) from what we send.
        body: JSON.stringify({ messages: next.slice(1), context: ctx, mode }),
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

  function reset() { setMsgs([greeting]); setInput(""); }

  const started = msgs.length > 1;

  return (
    <>
      {/* Launcher — sits above the mobile tab bar */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label={`Open D-Maths A.I, the ${staff ? "teaching assistant" : "learning buddy"}`}
          className="fixed bottom-24 right-4 z-[60] flex h-14 w-14 items-center justify-center rounded-full bg-gold text-board shadow-xl shadow-gold/40 transition hover:scale-105 active:scale-95 lg:bottom-6 lg:right-6"
        >
          <span><Icon name="compass" className="h-6 w-6" /></span>
          <span className="absolute -right-0.5 -top-0.5 flex h-3.5 w-3.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-70" />
            <span className="relative inline-flex h-3.5 w-3.5 rounded-full bg-emerald-500" />
          </span>
        </button>
      )}

      {/* Panel */}
      {open && (
        <div role="dialog" aria-label="D-Maths A.I assistant"
          className="chat-in fixed inset-x-3 bottom-24 z-[60] flex max-h-[72vh] flex-col overflow-hidden rounded-3xl border border-line bg-white shadow-2xl ring-1 ring-black/5 dark:border-white/10 dark:bg-board dark:ring-white/10 sm:inset-x-auto sm:right-6 sm:w-[400px] lg:bottom-6">
          {/* Header */}
          <div className="relative flex items-center gap-3 overflow-hidden px-4 py-3 text-white"
            style={{ background: "linear-gradient(120deg, #10406F 0%, #0A2A4F 60%, #071C36 100%)" }}>
            <div aria-hidden className="pointer-events-none absolute right-10 top-1 text-gold/25 float"><Icon name="sparkles" className="h-4 w-4" /></div>
            <span className="relative flex h-9 w-9 items-center justify-center rounded-full bg-gold text-board shadow-[0_0_18px_-4px_rgba(239,174,86,.9)]"><Icon name="compass" className="h-5 w-5" /></span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold leading-tight">D-Maths A.I · {staff ? "Teaching assistant" : "Learning buddy"}</p>
              <p className="text-[11px] text-white/55">{staff ? "Solutions, lesson ideas & marking help" : "Hints to help you — not the answers"}</p>
            </div>
            {started && (
              <button onClick={reset} aria-label="Start a new chat" title="New chat"
                className="rounded-lg p-1.5 text-white/70 hover:bg-white/10 hover:text-white">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 2v6h6" /><path d="M3 8a9 9 0 1 0 2.6-5.6L3 8" /></svg>
              </button>
            )}
            <button onClick={() => setOpen(false)} aria-label="Close" className="rounded-lg p-1.5 text-white/70 hover:bg-white/10 hover:text-white">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
            </button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 space-y-3.5 overflow-y-auto bg-chalk/50 px-3 py-4 dark:bg-board/40">
            {msgs.map((m, i) => (
              <div key={i} className={`msg-in flex items-end gap-2 ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                {m.role === "assistant" && (
                  <span aria-hidden className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-gold to-gold-deep text-board shadow-sm">
                    <Icon name="compass" className="h-4 w-4" />
                  </span>
                )}
                <div
                  className={`max-w-[78%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-[13.5px] leading-relaxed ${
                    m.role === "user"
                      ? "rounded-br-md bg-gradient-to-br from-gold to-gold-deep text-board shadow-sm"
                      : "rounded-bl-md border border-line bg-white text-ink shadow-sm dark:border-white/10 dark:bg-[#0f2942] dark:text-white"
                  }`}
                >
                  {m.role === "assistant" ? formatMessage(m.content) : m.content}
                </div>
              </div>
            ))}
            {busy && (
              <div className="flex items-end gap-2">
                <span aria-hidden className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-gold to-gold-deep text-board shadow-sm">
                  <Icon name="compass" className="h-4 w-4" />
                </span>
                <div className="flex gap-1 rounded-2xl rounded-bl-md border border-line bg-white px-3.5 py-3 shadow-sm dark:border-white/10 dark:bg-[#0f2942]">
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-ink/40 [animation-delay:-0.3s] dark:bg-white/40" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-ink/40 [animation-delay:-0.15s] dark:bg-white/40" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-ink/40 dark:bg-white/40" />
                </div>
              </div>
            )}
          </div>

          {/* Suggested-prompt chips — shown before the first question */}
          {!started && !busy && (
            <div className="flex flex-wrap gap-1.5 border-t border-line bg-white px-2.5 pt-2.5 dark:border-white/10 dark:bg-board">
              {chips.map((c) => (
                <button key={c} onClick={() => send(c)}
                  className="rounded-full border border-line bg-chalk/50 px-3 py-1.5 text-[12px] font-semibold text-ink/70 transition hover:-translate-y-0.5 hover:border-gold hover:bg-gold-pale hover:text-gold-deep dark:border-white/10 dark:bg-white/5 dark:text-white/70">
                  {c}
                </button>
              ))}
            </div>
          )}

          {/* Composer */}
          <div className="flex items-center gap-2 border-t border-line bg-white p-2.5 dark:border-white/10 dark:bg-board">
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder="Ask me anything about your work…"
              maxLength={2000}
              className="min-w-0 flex-1 rounded-full border border-line bg-chalk/50 px-4 py-2.5 text-sm text-ink outline-none transition focus:border-gold focus:bg-white dark:border-white/10 dark:bg-white/5 dark:text-white dark:focus:bg-white/10"
            />
            <button
              onClick={() => send()}
              disabled={busy || !input.trim()}
              aria-label="Send"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gold text-board shadow-sm transition hover:scale-105 hover:brightness-105 active:scale-90 disabled:opacity-40 disabled:hover:scale-100"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" /></svg>
            </button>
          </div>
        </div>
      )}
    </>
  );
}
