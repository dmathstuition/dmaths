"use client";
import { useEffect, useRef, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { useToast } from "@/components/Toast";

type Message = {
  id: string; student_id: string; sender_id: string;
  sender_role: string; body: string; audio_url?: string | null;
  read: boolean; created_at: string;
};

// Admin side of a direct thread with any non-admin party (thread key = ownerId).
// Used for admin↔tutor DMs. Mirrors the realtime + idempotent-delete behaviour
// of the learner chat: instant delivery over chat-<ownerId>, 45s reconciliation.
export default function AdminThread({ ownerId, ownerName }: { ownerId: string; ownerName: string }) {
  const supabase = supabaseBrowser();
  const push = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [peerTyping, setPeerTyping] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const channel = useRef<any>(null);
  const typingTimeout = useRef<any>(null);
  const lastTypingSent = useRef(0);

  function upsert(msg: Message) {
    setMessages(prev => prev.some(x => x.id === msg.id)
      ? prev
      : [...prev, msg].sort((a, b) => a.created_at.localeCompare(b.created_at)));
  }

  async function load(reconcile = false) {
    const { data } = await supabase.from("messages").select("*")
      .eq("student_id", ownerId).order("created_at", { ascending: true });
    if (!data) return;
    if (!reconcile) { setMessages(data); return; }
    setMessages(prev =>
      (prev.length === data.length && prev.every((m, i) => m.id === data[i].id)) ? prev : data);
  }

  useEffect(() => {
    load();
    supabase.from("messages").update({ read: true })
      .eq("student_id", ownerId).eq("sender_role", "student").eq("read", false).then(() => {});
    const i = setInterval(() => load(true), 45000);
    return () => clearInterval(i);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ownerId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, peerTyping]);

  useEffect(() => {
    const ch = supabase.channel(`chat-${ownerId}`);
    ch.on("broadcast", { event: "typing" }, ({ payload }: any) => {
      if (payload?.role === "admin") return;
      setPeerTyping(true);
      clearTimeout(typingTimeout.current);
      typingTimeout.current = setTimeout(() => setPeerTyping(false), 3000);
    }).on("broadcast", { event: "message" }, ({ payload }: any) => {
      const msg = payload?.message as Message | undefined;
      if (!msg || msg.sender_role === "admin") return;
      upsert(msg);
      supabase.from("messages").update({ read: true }).eq("id", msg.id).then(() => {});
    }).on("broadcast", { event: "delete" }, ({ payload }: any) => {
      if (payload?.id) setMessages(prev => prev.filter(x => x.id !== payload.id));
    }).subscribe();
    channel.current = ch;
    return () => { clearTimeout(typingTimeout.current); supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ownerId]);

  function broadcastTyping() {
    const now = Date.now();
    if (now - lastTypingSent.current < 1500) return;
    lastTypingSent.current = now;
    channel.current?.send({ type: "broadcast", event: "typing", payload: { role: "admin" } });
  }

  async function send() {
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    const res = await fetch("/api/messages/send", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentId: ownerId, body }),
    });
    const json = await res.json();
    setSending(false);
    if (!res.ok) { push(json.error || "Could not send.", "error"); return; }
    upsert(json.message);
    channel.current?.send({ type: "broadcast", event: "message", payload: { message: json.message } });
    setText("");
  }

  async function remove(id: string) {
    if (!window.confirm("Delete this message?")) return;
    const prev = messages;
    setMessages(m => m.filter(x => x.id !== id));
    const res = await fetch("/api/messages/delete", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (!res.ok) { setMessages(prev); push("Could not delete message.", "error"); return; }
    channel.current?.send({ type: "broadcast", event: "delete", payload: { id } });
  }

  return (
    <div className="flex h-[60vh] flex-col overflow-hidden rounded-xl border border-line bg-chalk/40">
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.length === 0 && <p className="py-10 text-center text-sm text-ink/40">No messages yet.</p>}
        {messages.map(m => {
          const mine = m.sender_role === "admin";
          return (
            <div key={m.id} className={`group flex items-center gap-1.5 ${mine ? "justify-end" : "justify-start"}`}>
              {mine && (
                <button onClick={() => remove(m.id)} aria-label="Delete message"
                  className="shrink-0 px-1 text-xs text-ink/30 transition hover:text-red-500">✕</button>
              )}
              <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${mine ? "bg-gold text-board" : "bg-white text-ink border border-line"}`}>
                <p className={`mb-0.5 text-[11px] font-bold ${mine ? "text-board/70" : "text-gold-deep"}`}>
                  {mine ? "You" : ownerName}
                </p>
                {m.audio_url
                  ? <audio controls preload="metadata" src={m.audio_url} className="max-w-full" style={{ height: 36 }} />
                  : <p className="whitespace-pre-wrap leading-relaxed">{m.body}</p>}
                <p className={`mt-1 text-[10px] ${mine ? "text-board/60" : "text-ink/35"}`}>
                  {new Date(m.created_at).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" })}
                </p>
              </div>
              {!mine && (
                <button onClick={() => remove(m.id)} aria-label="Delete message"
                  className="shrink-0 px-1 text-xs text-ink/30 transition hover:text-red-500">✕</button>
              )}
            </div>
          );
        })}
        {peerTyping && (
          <div className="flex items-center gap-1.5 px-1">
            <span className="text-[11px] font-bold text-gold-deep">{ownerName} is typing</span>
            <span className="typing-dot h-1.5 w-1.5 rounded-full bg-ink/40" />
            <span className="typing-dot h-1.5 w-1.5 rounded-full bg-ink/40" />
            <span className="typing-dot h-1.5 w-1.5 rounded-full bg-ink/40" />
          </div>
        )}
        <div ref={endRef} />
      </div>
      <div className="flex items-end gap-2 border-t border-line p-3">
        <textarea
          className="field max-h-32 flex-1 resize-none" rows={1}
          placeholder={`Message ${ownerName}…`}
          value={text}
          onChange={e => { setText(e.target.value); broadcastTyping(); }}
          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
        />
        <button onClick={send} disabled={sending || !text.trim()} className="btn-gold !min-h-[42px] !px-5">
          {sending ? "…" : "Send"}
        </button>
      </div>
    </div>
  );
}
