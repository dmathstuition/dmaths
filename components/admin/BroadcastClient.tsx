"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/Icons";
import { useToast } from "@/components/Toast";
import { fmtWAT } from "@/lib/time";

type ClassRow = { id: string; subject: string; starts_at: string };
type Scheduled = { id: string; type: string; value: string; body: string; send_at: string };
type Audience = "all" | "level" | "subject" | "class";

export default function BroadcastClient({ levels, subjects, classes, totalActive, scheduled }: {
  levels: string[]; subjects: string[]; classes: ClassRow[]; totalActive: number; scheduled: Scheduled[];
}) {
  const router = useRouter();
  const push = useToast();
  const [type, setType] = useState<Audience>("all");
  const [value, setValue] = useState("");
  const [body, setBody] = useState("");
  const [when, setWhen] = useState<"now" | "later">("now");
  const [sendAt, setSendAt] = useState("");
  const [busy, setBusy] = useState(false);

  const options: { id: Audience; label: string; icon: any }[] = [
    { id: "all", label: "Everyone", icon: "students" },
    { id: "level", label: "By level", icon: "graduationCap" },
    { id: "subject", label: "By subject", icon: "curriculum" },
    { id: "class", label: "A class", icon: "classes" },
  ];

  function audienceLabelFor(t: string, v: string) {
    if (t === "all") return "Everyone";
    if (t === "level") return v;
    if (t === "subject") return v;
    const c = classes.find(x => x.id === v);
    return c ? `${c.subject} · ${fmtWAT(c.starts_at)}` : "A class";
  }

  async function send() {
    if (!body.trim()) { push("Write a message first.", "error"); return; }
    if (type !== "all" && !value) { push("Choose a target for that audience.", "error"); return; }
    if (when === "later" && !sendAt) { push("Pick a date and time to schedule.", "error"); return; }

    const audienceLabel =
      type === "all" ? `all ${totalActive} active students` : `"${audienceLabelFor(type, value)}"`;
    const verb = when === "later" ? "Schedule" : "Send";
    if (!confirm(`${verb} this message to ${audienceLabel}?`)) return;

    setBusy(true);
    const res = await fetch("/api/messages/broadcast", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, value, body, ...(when === "later" ? { sendAt: new Date(sendAt).toISOString() } : {}) }),
    });
    setBusy(false);
    const j = await res.json().catch(() => ({}));
    if (!res.ok) { push(j.error || "Could not send the broadcast.", "error"); return; }
    if (j.scheduled) {
      push(`Scheduled for ${new Date(j.sendAt).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" })}.`, "success");
    } else {
      push(`Sent to ${j.sent} student${j.sent === 1 ? "" : "s"}.`, "success");
    }
    setBody(""); setSendAt(""); setWhen("now");
    router.refresh();
  }

  async function cancel(id: string) {
    if (!confirm("Cancel this scheduled broadcast?")) return;
    const res = await fetch(`/api/messages/broadcast?id=${id}`, { method: "DELETE" });
    if (!res.ok) { push("Could not cancel it.", "error"); return; }
    push("Scheduled broadcast cancelled.", "success");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="boardgrid relative flex items-center gap-4 overflow-hidden rounded-2xl bg-board p-7 text-white">
        <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-gold/15 text-gold ring-1 ring-gold/25">
          <Icon name="messages" className="h-6 w-6" />
        </span>
        <div>
          <h1 className="font-display text-2xl font-semibold sm:text-3xl">Broadcast message</h1>
          <p className="mt-1 text-sm text-white/50">
            Send a direct message (with a push notification) to a whole group — now or scheduled for later.
          </p>
        </div>
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

        {/* when */}
        <label className="flabel mt-4 block">When</label>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          {(["now", "later"] as const).map(w => (
            <button key={w} type="button" onClick={() => setWhen(w)}
              className={`rounded-xl border px-4 py-2 text-sm font-semibold transition ${
                when === w ? "border-gold bg-gold-pale text-gold-deep" : "border-line bg-white text-ink/60 hover:bg-chalk"}`}>
              {w === "now" ? "Send now" : "Schedule"}
            </button>
          ))}
          {when === "later" && (
            <input type="datetime-local" className="field !mt-0 max-w-[220px]" value={sendAt}
              min={new Date(Date.now() + 60_000).toISOString().slice(0, 16)}
              onChange={e => setSendAt(e.target.value)} />
          )}
        </div>

        <button className="btn-gold mt-5 inline-flex items-center gap-2" onClick={send} disabled={busy}>
          <Icon name={when === "later" ? "clock" : "messages"} className="h-4 w-4" />
          {busy ? "Working…" : when === "later" ? "Schedule broadcast" : "Send broadcast"}
        </button>
      </div>

      {/* pending scheduled */}
      {scheduled.length > 0 && (
        <div className="card neu-card overflow-hidden">
          <div className="border-b border-line px-6 py-4">
            <h2 className="font-display text-lg font-semibold text-ink">Scheduled ({scheduled.length})</h2>
          </div>
          <div className="divide-y divide-line/60">
            {scheduled.map(s => (
              <div key={s.id} className="flex items-start gap-3 px-5 py-3.5">
                <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-gold-pale text-gold-deep">
                  <Icon name="clock" className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-ink">
                    {new Date(s.send_at).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" })}
                    <span className="ml-2 text-xs font-normal text-ink/45">→ {audienceLabelFor(s.type, s.value)}</span>
                  </p>
                  <p className="truncate text-xs text-ink/55">{s.body}</p>
                </div>
                <button onClick={() => cancel(s.id)}
                  className="flex-shrink-0 rounded-lg px-2 py-1.5 text-xs font-bold text-red-500 hover:bg-red-50">
                  Cancel
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
