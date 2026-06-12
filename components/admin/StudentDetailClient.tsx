"use client";
import { useState } from "react";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabase/client";

export default function StudentDetailClient({ student, initialNotes, initialRewards, subs }: {
  student: any; initialNotes: any[]; initialRewards: any[]; subs: any[];
}) {
  const supabase = supabaseBrowser();
  const [notes, setNotes] = useState(initialNotes);
  const [rewards, setRewards] = useState(initialRewards);
  const [note, setNote] = useState("");
  const [reward, setReward] = useState({ stars: 5, message: "", notify: true });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const graded = subs.filter(s => s.status === "graded").length;
  const pending = subs.filter(s => s.status === "pending").length;

  async function addNote() {
    if (!note.trim()) return;
    const { data: { user } } = await supabase.auth.getUser();
    const { data } = await supabase.from("admin_notes")
      .insert({ student_id: student.id, note: note.trim(), created_by: user?.id })
      .select().single();
    if (data) { setNotes([data, ...notes]); setNote(""); }
  }
  async function deleteNote(id: string) {
    await supabase.from("admin_notes").delete().eq("id", id);
    setNotes(notes.filter(n => n.id !== id));
  }

  async function giveReward() {
    if (!reward.message.trim()) return setMsg("Add a reward message.");
    setBusy(true); setMsg("");
    const res = await fetch("/api/rewards", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentId: student.id, ...reward }),
    });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) return setMsg(json.error || "Failed");
    setMsg(reward.notify ? (json.emailed ? "Reward given and emailed." : "Reward saved (email failed).") : "Reward given.");
    // refresh rewards list
    const { data } = await supabase.from("rewards").select("*").eq("student_id", student.id).order("created_at", { ascending: false });
    setRewards(data ?? []);
    setReward({ stars: 5, message: "", notify: true });
  }

  return (
    <div className="space-y-6">
      <Link href="/admin/students" className="text-sm font-semibold text-gold-deep hover:underline">← All students</Link>

      <div className="card p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-semibold">{student.first_name} {student.last_name}</h1>
            <p className="font-mono text-sm text-ink/45">{student.student_code} · {student.level}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {(student.subjects ?? []).map((s: string) => <span key={s} className="pill-blue">{s}</span>)}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4 text-center">
            <Stat label="Avg" value={`${student.avg_score}%`} />
            <Stat label="Attend" value={`${student.attendance}%`} />
            <Stat label="Stars" value={`${student.stars}/5`} />
          </div>
        </div>
        <p className="mt-4 border-t border-line pt-3 text-sm text-ink/55">
          {student.email} · {student.phone} · Guardian: {student.guardian_name} ({student.guardian_contact}) · {graded} graded, {pending} pending
        </p>
      </div>

      {msg && <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-900">{msg}</p>}

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Rewards */}
        <div className="card p-6">
          <h2 className="font-display text-lg font-semibold">Give a reward</h2>
          <div className="mt-3 space-y-3">
            <div className="flex gap-1">
              {[1,2,3,4,5].map(n => (
                <button key={n} onClick={() => setReward({ ...reward, stars: n })}
                  className={`text-2xl ${n <= reward.stars ? "text-gold" : "text-ink/15"}`}>★</button>
              ))}
            </div>
            <textarea className="field min-h-16" placeholder="e.g. Excellent work on calculus this week!"
              value={reward.message} onChange={e => setReward({ ...reward, message: e.target.value })} />
            <label className="flex items-center gap-2 text-sm text-ink/60">
              <input type="checkbox" checked={reward.notify} onChange={e => setReward({ ...reward, notify: e.target.checked })} className="accent-gold" />
              Email the student
            </label>
            <button className="btn-gold" onClick={giveReward} disabled={busy}>{busy ? "Saving…" : "Give reward"}</button>
          </div>
          <div className="mt-5 space-y-2 border-t border-line pt-4">
            {rewards.map(r => (
              <div key={r.id} className="rounded-xl bg-chalk px-4 py-2.5 text-sm">
                <span className="text-gold">{"★".repeat(r.stars)}</span>
                <span className="ml-2 text-ink/70">{r.message}</span>
                <span className="block text-xs text-ink/35">{new Date(r.created_at).toLocaleDateString("en-NG", { dateStyle: "medium" })}</span>
              </div>
            ))}
            {!rewards.length && <p className="text-sm text-ink/35">No rewards yet.</p>}
          </div>
        </div>

        {/* Admin notes */}
        <div className="card p-6">
          <h2 className="font-display text-lg font-semibold">Private notes</h2>
          <p className="text-xs text-ink/40">Visible to staff only — never shown to the student.</p>
          <div className="mt-3 space-y-3">
            <textarea className="field min-h-16" placeholder="Add a note about this student…"
              value={note} onChange={e => setNote(e.target.value)} />
            <button className="btn-ink" onClick={addNote}>Add note</button>
          </div>
          <div className="mt-5 space-y-2 border-t border-line pt-4">
            {notes.map(n => (
              <div key={n.id} className="group flex items-start justify-between gap-2 rounded-xl bg-chalk px-4 py-2.5 text-sm">
                <div>
                  <p className="text-ink/70">{n.note}</p>
                  <p className="text-xs text-ink/35">{new Date(n.created_at).toLocaleDateString("en-NG", { dateStyle: "medium" })}</p>
                </div>
                <button onClick={() => deleteNote(n.id)} className="text-xs font-bold text-red-600 opacity-0 group-hover:opacity-100">Delete</button>
              </div>
            ))}
            {!notes.length && <p className="text-sm text-ink/35">No notes yet.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="font-display text-xl font-semibold">{value}</p>
      <p className="text-[10px] font-bold uppercase tracking-wide text-ink/40">{label}</p>
    </div>
  );
}
