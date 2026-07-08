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
  audio_url?: string | null;
  read: boolean;
  created_at: string;
};

// Learner side of the conversation: read the thread and reply. The learner
// only ever has ONE thread (their own), so no thread switching is needed.
// Extras: live "typing…" indicator (Supabase realtime broadcast, shared with
// the admin panel on channel chat-<studentId>) and voice notes (MediaRecorder
// → /api/messages/voice → message with audio_url).
export default function MessagesClient({ meId, initialMessages }: { meId: string; initialMessages: Message[] }) {
  const supabase = supabaseBrowser();
  const push = useToast();
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [peerTyping, setPeerTyping] = useState(false);
  const [recording, setRecording] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const typingChannel = useRef<any>(null);
  const typingTimeout = useRef<any>(null);
  const lastTypingSent = useRef(0);
  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, peerTyping]);

  // Add a message without duplicating one we already have (keeps chronological
  // order). Used by both realtime pushes and the reconciliation poll.
  function upsertMessage(msg: Message) {
    setMessages(prev => {
      if (prev.some(x => x.id === msg.id)) return prev;
      return [...prev, msg].sort((a, b) => a.created_at.localeCompare(b.created_at));
    });
  }

  // Mark the team's messages as read once on mount.
  useEffect(() => {
    supabase.from("messages").update({ read: true })
      .eq("sender_role", "admin").eq("read", false).then(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Light reconciliation poll (~45s): a safety net if a realtime event was
  // missed. Only re-renders when the thread actually changed, so it doesn't
  // cause the lag a full 15s refetch-and-rerender did.
  useEffect(() => {
    const i = setInterval(async () => {
      const { data } = await supabase.from("messages").select("*").order("created_at", { ascending: true });
      if (!data) return;
      setMessages(prev => {
        if (prev.length === data.length && prev.every((m, idx) => m.id === data[idx].id)) return prev;
        return data;
      });
    }, 45000);
    return () => clearInterval(i);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Realtime channel chat-<studentId>: typing indicator + instant delivery of
  // new messages and deletes (both sides broadcast here).
  useEffect(() => {
    const ch = supabase.channel(`chat-${meId}`);
    ch.on("broadcast", { event: "typing" }, ({ payload }: any) => {
      if (payload?.role === "student") return; // that's us
      setPeerTyping(true);
      clearTimeout(typingTimeout.current);
      typingTimeout.current = setTimeout(() => setPeerTyping(false), 3000);
    }).on("broadcast", { event: "message" }, ({ payload }: any) => {
      const msg = payload?.message as Message | undefined;
      if (!msg || msg.sender_role === "student") return; // ignore our own echo
      upsertMessage(msg);
      // A team message just arrived while we're looking at the thread → mark read.
      supabase.from("messages").update({ read: true }).eq("id", msg.id).then(() => {});
    }).on("broadcast", { event: "delete" }, ({ payload }: any) => {
      if (payload?.id) setMessages(prev => prev.filter(x => x.id !== payload.id));
    }).subscribe();
    typingChannel.current = ch;
    return () => {
      clearTimeout(typingTimeout.current);
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meId]);

  function broadcastTyping() {
    const now = Date.now();
    if (now - lastTypingSent.current < 1500) return; // throttle
    lastTypingSent.current = now;
    typingChannel.current?.send({ type: "broadcast", event: "typing", payload: { role: "student" } });
  }

  // Push a just-sent/deleted message to the other device instantly.
  function broadcastMessage(message: Message) {
    typingChannel.current?.send({ type: "broadcast", event: "message", payload: { message } });
  }
  function broadcastDelete(id: string) {
    typingChannel.current?.send({ type: "broadcast", event: "delete", payload: { id } });
  }

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
    upsertMessage(json.message);
    broadcastMessage(json.message);
    setText("");
  }

  // ── Voice notes ──────────────────────────────────────────────────
  async function toggleRecording() {
    if (recording) { recorder.current?.stop(); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/mp4";
      const rec = new MediaRecorder(stream, { mimeType: mime });
      chunks.current = [];
      rec.ondataavailable = (e) => { if (e.data.size) chunks.current.push(e.data); };
      rec.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        setRecording(false);
        const blob = new Blob(chunks.current, { type: mime });
        if (blob.size < 1000) return; // accidental tap
        await sendVoice(blob, mime);
      };
      rec.start();
      recorder.current = rec;
      setRecording(true);
    } catch {
      push("Microphone access was blocked — allow it in your browser settings to send voice notes.", "error");
    }
  }

  async function sendVoice(blob: Blob, mime: string) {
    setSending(true);
    const fd = new FormData();
    fd.append("file", new File([blob], `vn.${mime.includes("mp4") ? "m4a" : "webm"}`, { type: mime }));
    const up = await fetch("/api/messages/voice", { method: "POST", body: fd });
    const upJson = await up.json().catch(() => ({}));
    if (!up.ok) { setSending(false); push(upJson.error || "Could not upload the voice note.", "error"); return; }

    const res = await fetch("/api/messages/send", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: "", audioUrl: upJson.url }),
    });
    const json = await res.json().catch(() => ({}));
    setSending(false);
    if (!res.ok) { push(json.error || "Could not send the voice note.", "error"); return; }
    upsertMessage(json.message);
    broadcastMessage(json.message);
  }

  async function remove(id: string) {
    if (!window.confirm("Delete this message?")) return;
    const prev = messages;
    setMessages(m => m.filter(x => x.id !== id)); // optimistic
    const res = await fetch("/api/messages/delete", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (!res.ok) { setMessages(prev); push("Could not delete message.", "error"); return; }
    broadcastDelete(id); // remove it from the other device instantly
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
            <div key={m.id} className={`page-enter group flex items-center gap-1.5 ${mine ? "justify-end" : "justify-start"}`}>
              {mine && (
                <button onClick={() => remove(m.id)} aria-label="Delete message"
                  className="shrink-0 px-1 text-xs text-ink/30 transition hover:text-red-500">✕</button>
              )}
              <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${
                mine ? "bg-gold text-board" : "bg-chalk text-ink"
              }`}>
                {!mine && <p className="mb-0.5 text-[11px] font-bold text-gold-deep">D-Maths team</p>}
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
          <div className="flex justify-start">
            <div className="flex items-center gap-1.5 rounded-2xl bg-chalk px-4 py-3">
              <span className="text-[11px] font-bold text-gold-deep">D-Maths team</span>
              <span className="typing-dot h-1.5 w-1.5 rounded-full bg-ink/40" />
              <span className="typing-dot h-1.5 w-1.5 rounded-full bg-ink/40" />
              <span className="typing-dot h-1.5 w-1.5 rounded-full bg-ink/40" />
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div className="flex items-end gap-2 border-t border-line p-3">
        <textarea
          className="field max-h-32 flex-1 resize-none"
          rows={1}
          placeholder={recording ? "Recording… tap ⏹ to send" : "Write a message…"}
          value={text}
          onChange={e => { setText(e.target.value); broadcastTyping(); }}
          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
        />
        <button onClick={toggleRecording} disabled={sending} aria-label={recording ? "Stop and send voice note" : "Record a voice note"}
          className={`btn !min-h-[42px] !px-4 ${recording ? "bg-red-500 text-white badge-pulse" : "border border-line bg-white text-ink/60 hover:bg-chalk"}`}>
          {recording ? "⏹" : "🎤"}
        </button>
        <button onClick={send} disabled={sending || !text.trim()} className="btn-gold !min-h-[42px] !px-5">
          {sending ? "…" : "Send"}
        </button>
      </div>
    </div>
  );
}
