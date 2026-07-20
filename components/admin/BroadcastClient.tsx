"use client";
import { useState } from "react";
import { Icon } from "@/components/Icons";
import { useToast } from "@/components/Toast";
import { fmtWAT } from "@/lib/time";

type ClassRow = { id: string; subject: string; starts_at: string };
type Audience = "all" | "level" | "subject" | "class";

export default function BroadcastClient({ levels, subjects, classes, totalActive }: {
  levels: string[]; subjects: string[]; classes: ClassRow[]; totalActive: number;
}) {
  const push = useToast();
  const [type, setType] = useState<Audience>("all");
  const [value, setValue] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);

  const options: { id: Audience; label: string; icon: any }[] = [
    { id: "all", label: "Everyone", icon: "students" },
    { id: "level", label: "By level", icon: "graduationCap" },
    { id: "subject", label: "By subject", icon: "curriculum" },
    { id: "class", label: "A class", icon: "classes" },
  ];

  async function send() {
    if (!body.trim()) { push("Write a message first.", "error"); return; }
    if (type !== "all" && !value) { push("Choose a target for that audience.", "error"); return; }
    const audienceLabel =
      type === "all" ? `all ${totalActive} active students`
      : type === "level" ? `everyone in ${value}`
      : type === "subject" ? `everyone taking ${value}`
      : `the selected class`;
    if (!confirm(`Send this message to ${audienceLabel}?`)) return;

    setBusy(true);
    const res = await fetch("/api/messages/broadcast", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, value, body }),
    });
    setBusy(false);
    const j = await res.json().catch(() => ({}));
    if (!res.ok) { push(j.error || "Could not send the broadcast.", "error"); return; }
    push(`Sent to ${j.sent} student${j.sent === 1 ? "" : "s"}.`, "success");
    setBody("");
  }

  return (
    <div className="space-y-6">
      <div className="boardgrid relative overflow-hidden rounded-2xl bg-board p-7 text-white">
        <h1 className="font-display text-2xl font-semibold sm:text-3xl">📢 Broadcast message</h1>
        <p className="mt-1 text-sm text-white/50">
          Send a direct message (with a push notification) to a whole group at once. It lands in each student&apos;s inbox.
        </p>
      </div>

      <div className="card p-6">
        {/* audience */}
        <label className="flabel">Send to</label>
        <div className="mt-1 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {options.map(o => (
            <button key={o.id} type="button"
              onClick={() => { setType(o.id); setValue(""); }}
              className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold transition ${
                type === o.id ? "border-gold bg-gold-pale text-gold-deep" : "border-line bg-white text-ink/60 hover:bg-chalk"}`}>
              <Icon name={o.icon} className="h-4 w-4" /> {o.label}
            </button>
          ))}
        </div>

        {/* target selector */}
        {type === "level" && (
          <select className="field mt-3" value={value} onChange={e => setValue(e.target.value)}>
            <option value="">Choose a level…</option>
            {levels.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
        )}
        {type === "subject" && (
          <select className="field mt-3" value={value} onChange={e => setValue(e.target.value)}>
            <option value="">Choose a subject…</option>
            {subjects.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        )}
        {type === "class" && (
          <select className="field mt-3" value={value} onChange={e => setValue(e.target.value)}>
            <option value="">Choose a class…</option>
            {classes.map(c => <option key={c.id} value={c.id}>{c.subject} · {fmtWAT(c.starts_at)}</option>)}
          </select>
        )}
        {type === "all" && (
          <p className="mt-3 text-[13px] text-ink/50">This reaches all <strong>{totalActive}</strong> active students.</p>
        )}

        {/* message */}
        <label className="flabel mt-5 block">Message</label>
        <textarea className="field min-h-[120px]" value={body} maxLength={2000}
          onChange={e => setBody(e.target.value)}
          placeholder="e.g. Reminder: tomorrow's 4pm class has moved to 5pm. See you there!" />
        <p className="mt-1 text-right text-[11px] text-ink/40">{body.length}/2000</p>

        <button className="btn-gold mt-2 inline-flex items-center gap-2" onClick={send} disabled={busy}>
          <Icon name="messages" className="h-4 w-4" /> {busy ? "Sending…" : "Send broadcast"}
        </button>
      </div>
    </div>
  );
}
