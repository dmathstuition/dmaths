"use client";
import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/Icons";
import { formatMessage } from "@/components/portal/chatFormat";

type Msg = { role: "user" | "assistant"; content: string };
type Convo = { id: string; title: string; updated_at: string };

const GREETING =
  "Hi, I'm D-Maths A.I — your learning buddy! Stuck on some maths, English or code? Tell me what you're working on and I'll help you figure it out (I give hints, not the finished answer 😉).";
const CHIPS = ["Explain this concept", "Give me a hint", "Where do I start?", "Check my thinking"];

function since(iso: string): string {
  const d = (Date.now() - new Date(iso).getTime()) / 1000;
  if (d < 60) return "just now";
  if (d < 3600) return `${Math.floor(d / 60)}m ago`;
  if (d < 86400) return `${Math.floor(d / 3600)}h ago`;
  return `${Math.floor(d / 86400)}d ago`;
}

export default function AssistantPageClient() {
  const [convos, setConvos] = useState<Convo[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [showList, setShowList] = useState(false); // mobile history panel
  const scrollRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  async function loadList() {
    try { const r = await fetch("/api/assistant/history"); const j = await r.json(); setConvos(j.conversations ?? []); } catch { /* keep */ }
  }
  useEffect(() => { loadList(); }, []);
  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [msgs, busy]);

  function newChat() { setActiveId(null); setMsgs([]); setErr(""); setShowList(false); taRef.current?.focus(); }

  async function openConvo(id: string) {
    setErr(""); setShowList(false);
    try {
      const r = await fetch(`/api/assistant/history?id=${encodeURIComponent(id)}`);
      const j = await r.json();
      if (r.ok) { setActiveId(id); setMsgs(j.messages ?? []); }
      else setErr(j.error || "Couldn't open that chat.");
    } catch { setErr("Couldn't open that chat."); }
  }

  async function removeConvo(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    setConvos((c) => c.filter((x) => x.id !== id));
    if (activeId === id) newChat();
    try { await fetch(`/api/assistant/history?id=${encodeURIComponent(id)}`, { method: "DELETE" }); } catch { /* ignore */ }
  }

  async function persist(next: Msg[], id: string | null): Promise<string | null> {
    try {
      const r = await fetch("/api/assistant/history", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, messages: next }),
      });
      const j = await r.json();
      if (r.ok && j.id) { loadList(); return j.id as string; }
    } catch { /* history is best-effort */ }
    return id;
  }

  async function send(text?: string) {
    const content = (text ?? input).trim();
    if (!content || busy) return;
    setErr(""); setInput("");
    const withUser = [...msgs, { role: "user" as const, content }];
    setMsgs(withUser);
    setBusy(true);
    try {
      const res = await fetch("/api/assistant", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: withUser }),
      });
      const json = await res.json();
      setBusy(false);
      if (!res.ok) { setErr(json.error || "Sorry, I couldn't reply just now."); return; }
      const full = [...withUser, { role: "assistant" as const, content: json.reply }];
      setMsgs(full);
      const savedId = await persist(full, activeId);
      if (savedId && savedId !== activeId) setActiveId(savedId);
    } catch {
      setBusy(false); setErr("Something went wrong — please try again.");
    }
  }

  const empty = msgs.length === 0;

  return (
    <div className="flex h-[calc(100vh-9rem)] gap-4 lg:h-[calc(100vh-8rem)]">
      {/* ── History sidebar (desktop) ─────────────────────────────── */}
      <aside className="hidden w-64 flex-shrink-0 flex-col rounded-2xl border border-line bg-white dark:border-white/10 dark:bg-[#0f2942] lg:flex">
        <div className="p-3">
          <button onClick={newChat} className="btn-gold w-full !rounded-xl"><span className="inline-flex items-center gap-1.5"><Icon name="plusSquare" className="h-4 w-4" /> New chat</span></button>
        </div>
        <ConvoList convos={convos} activeId={activeId} onOpen={openConvo} onRemove={removeConvo} />
      </aside>

      {/* ── Chat area ─────────────────────────────────────────────── */}
      <div className="relative flex min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-line bg-white dark:border-white/10 dark:bg-board">
        {/* header */}
        <div className="relative flex items-center gap-3 overflow-hidden px-4 py-3 text-white"
          style={{ background: "linear-gradient(120deg, #10406F 0%, #0A2A4F 60%, #071C36 100%)" }}>
          <div aria-hidden className="pointer-events-none absolute right-8 top-1 text-gold/25 float"><Icon name="sparkles" className="h-4 w-4" /></div>
          <span className="relative flex h-9 w-9 items-center justify-center rounded-full bg-gold text-board shadow-[0_0_18px_-4px_rgba(239,174,86,.9)]"><Icon name="compass" className="h-5 w-5" /></span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold leading-tight">D-Maths A.I · Learning buddy</p>
            <p className="text-[11px] text-white/55">Hints to help you — not the answers</p>
          </div>
          <button onClick={() => setShowList(true)} className="rounded-lg p-1.5 text-white/70 hover:bg-white/10 lg:hidden" aria-label="Chat history"><Icon name="menu" className="h-5 w-5" /></button>
          <button onClick={newChat} className="rounded-lg p-1.5 text-white/70 hover:bg-white/10" title="New chat" aria-label="New chat"><Icon name="plusSquare" className="h-5 w-5" /></button>
        </div>

        {/* messages */}
        <div ref={scrollRef} className="flex-1 space-y-3.5 overflow-y-auto bg-chalk/50 px-3 py-4 dark:bg-board/40 sm:px-5">
          {empty && (
            <div className="msg-in flex items-end gap-2">
              <Bubble who="assistant" content={GREETING} />
            </div>
          )}
          {msgs.map((m, i) => (
            <div key={i} className={`msg-in flex items-end gap-2 ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <Bubble who={m.role} content={m.content} />
            </div>
          ))}
          {busy && (
            <div className="flex items-end gap-2">
              <Avatar />
              <div className="flex gap-1 rounded-2xl rounded-bl-md border border-line bg-white px-3.5 py-3 shadow-sm dark:border-white/10 dark:bg-[#0f2942]">
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-ink/40 [animation-delay:-0.3s] dark:bg-white/40" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-ink/40 [animation-delay:-0.15s] dark:bg-white/40" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-ink/40 dark:bg-white/40" />
              </div>
            </div>
          )}
        </div>

        {err && <p role="alert" className="mx-3 mb-2 rounded-xl bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-800">{err}</p>}

        {/* suggestion chips (new chat only) */}
        {empty && !busy && (
          <div className="flex flex-wrap gap-1.5 border-t border-line bg-white px-3 pt-2.5 dark:border-white/10 dark:bg-board">
            {CHIPS.map((c) => (
              <button key={c} onClick={() => send(c)} className="rounded-full border border-line bg-chalk/50 px-3 py-1.5 text-[12px] font-semibold text-ink/70 transition hover:-translate-y-0.5 hover:border-gold hover:bg-gold-pale hover:text-gold-deep dark:border-white/10 dark:bg-white/5 dark:text-white/70">{c}</button>
            ))}
          </div>
        )}

        {/* composer */}
        <div className="flex items-end gap-2 border-t border-line bg-white p-3 dark:border-white/10 dark:bg-board">
          <textarea ref={taRef} value={input} rows={1}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder="Ask me anything about your work…" maxLength={2000}
            className="max-h-32 min-h-[44px] min-w-0 flex-1 resize-none rounded-2xl border border-line bg-chalk/50 px-4 py-2.5 text-sm text-ink outline-none transition focus:border-gold focus:bg-white dark:border-white/10 dark:bg-white/5 dark:text-white dark:focus:bg-white/10" />
          <button onClick={() => send()} disabled={busy || !input.trim()} aria-label="Send"
            className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-gold text-board shadow-sm transition hover:scale-105 hover:brightness-105 active:scale-90 disabled:opacity-40 disabled:hover:scale-100">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" /></svg>
          </button>
        </div>
      </div>

      {/* ── History drawer (mobile) ───────────────────────────────── */}
      {showList && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowList(false)} />
          <div className="pop-in absolute inset-y-0 left-0 flex w-72 flex-col bg-white dark:bg-[#0f2942]">
            <div className="flex items-center justify-between p-3">
              <button onClick={newChat} className="btn-gold flex-1 !rounded-xl"><span className="inline-flex items-center gap-1.5"><Icon name="plusSquare" className="h-4 w-4" /> New chat</span></button>
              <button onClick={() => setShowList(false)} className="ml-2 rounded-lg p-2 text-ink/50" aria-label="Close"><Icon name="close" /></button>
            </div>
            <ConvoList convos={convos} activeId={activeId} onOpen={openConvo} onRemove={removeConvo} />
          </div>
        </div>
      )}
    </div>
  );
}

function ConvoList({ convos, activeId, onOpen, onRemove }: {
  convos: Convo[]; activeId: string | null;
  onOpen: (id: string) => void; onRemove: (id: string, e: React.MouseEvent) => void;
}) {
  return (
    <div className="flex-1 overflow-y-auto px-2 pb-3">
      {convos.length === 0 ? (
        <p className="px-2 py-6 text-center text-xs text-ink/40 dark:text-white/40">No saved chats yet.</p>
      ) : (
        <ul className="space-y-0.5">
          {convos.map((c) => (
            <li key={c.id}
              className={`group flex items-center gap-1 rounded-lg pr-1 transition ${activeId === c.id ? "bg-gold-pale text-gold-deep dark:bg-gold/15" : "text-ink/70 hover:bg-chalk dark:text-white/70 dark:hover:bg-white/5"}`}>
              <button onClick={() => onOpen(c.id)} className="flex min-w-0 flex-1 items-center gap-2 px-2.5 py-2 text-left">
                <Icon name="messages" className="h-3.5 w-3.5 flex-shrink-0 opacity-60" />
                <span className="min-w-0 flex-1 truncate text-[13px] font-semibold">{c.title}</span>
                <span className="flex-shrink-0 text-[10px] text-ink/35 dark:text-white/30">{since(c.updated_at)}</span>
              </button>
              <button onClick={(e) => onRemove(c.id, e)} aria-label="Delete chat"
                className="flex-shrink-0 rounded p-1 text-ink/30 opacity-0 transition hover:text-red-500 group-hover:opacity-100">
                <Icon name="close" className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Avatar() {
  return (
    <span aria-hidden className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-gold to-gold-deep text-board shadow-sm">
      <Icon name="compass" className="h-4 w-4" />
    </span>
  );
}

function Bubble({ who, content }: { who: "user" | "assistant"; content: string }) {
  return (
    <>
      {who === "assistant" && <Avatar />}
      <div className={`max-w-[80%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-[14px] leading-relaxed ${
        who === "user"
          ? "rounded-br-md bg-gradient-to-br from-gold to-gold-deep text-board shadow-sm"
          : "rounded-bl-md border border-line bg-white text-ink shadow-sm dark:border-white/10 dark:bg-[#0f2942] dark:text-white"}`}>
        {who === "assistant" ? formatMessage(content) : content}
      </div>
    </>
  );
}
