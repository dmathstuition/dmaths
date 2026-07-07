"use client";
import { useEffect, useRef, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { useToast } from "@/components/Toast";

type Message = {
  id: string;
  student_id: string;
  sender_id: string;
  sender_role: "admin" | "student";
  body: string;
  read: boolean;
  created_at: string;
};

// Learner side of the conversation: read the thread and reply. The learner
// only ever has ONE thread (their own), so no thread switching is needed.
export default function MessagesClient({ meId, initialMessages }: { meId: string; initialMessages: Message[] }) {
  const supabase = supabaseBrowser();
  const push = useToast();
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  // Mark the team's messages as read, and poll for new ones (~15s).
  useEffect(() => {
    supabase.from("messages").update({ read: true })
      .eq("sender_role", "admin").eq("read", false).then(() => {});

    const i = setInterval(async () => {
      const { data } = await supabase.from("messages").select("*").order("created_at", { ascending: true });
      if (data) setMessages(data);
    }, 15000);
    return () => clearInterval(i);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function send() {
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    const res = await fetch("/api/messages/send", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body }),
    });
    const json = await res.json();
    setSending(false);
    if (!res.ok) { push(json.error || "Could not send.", "error"); return; }
    setMessages(prev => [...prev, json.message]);
    setText("");
  }

  async function remove(id: string) {
    if (!window.confirm("Delete this message?")) return;
    const prev = messages;
    setMessages(m => m.filter(x => x.id !== id)); // optimistic
    const res = await fetch("/api/messages/delete", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (!res.ok) { setMessages(prev); push("Could not delete message.", "error"); }
  }

  return (
    <div className="card flex h-[70vh] flex-col overflow-hidden">
      <div className="flex-1 space-y-3 overflow-y-auto p-5">
        {messages.length === 0 && (
          <p className="py-12 text-center text-sm text-ink/40">No messages yet. Say hello 👋</p>
        )}
        {messages.map(m => {
          const mine = m.sender_role === "student";
          return (
            <div key={m.id} className={`group flex items-center gap-1.5 ${mine ? "justify-end" : "justify-start"}`}>
              {mine && (
                <button onClick={() => remove(m.id)} aria-label="Delete message"
                  className="shrink-0 px-1 text-xs text-ink/30 transition hover:text-red-500">✕</button>
              )}
              <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${
                mine ? "bg-gold text-board" : "bg-chalk text-ink"
              }`}>
                {!mine && <p className="mb-0.5 text-[11px] font-bold text-gold-deep">D-Maths team</p>}
                <p className="whitespace-pre-wrap leading-relaxed">{m.body}</p>
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
        <div ref={endRef} />
      </div>

      <div className="flex items-end gap-2 border-t border-line p-3">
        <textarea
          className="field max-h-32 flex-1 resize-none"
          rows={1}
          placeholder="Write a message…"
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
        />
        <button onClick={send} disabled={sending || !text.trim()} className="btn-gold !min-h-[42px] !px-5">
          {sending ? "…" : "Send"}
        </button>
      </div>
    </div>
  );
}
