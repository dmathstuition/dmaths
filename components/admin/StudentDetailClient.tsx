"use client";
import { useState } from "react";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabase/client";
import { useToast } from "@/components/Toast";

export default function StudentDetailClient({ student, initialNotes, initialRewards, subs }: {
  student: any; initialNotes: any[]; initialRewards: any[]; subs: any[];
}) {
  const supabase = supabaseBrowser();
  const push = useToast();
  const [notes, setNotes] = useState(initialNotes);
  const [rewards, setRewards] = useState(initialRewards);
  const [note, setNote] = useState("");
  const [reward, setReward] = useState({ stars: 5, message: "", notify: true });
  const [busy, setBusy] = useState(false);
  const [rewardError, setRewardError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmName, setConfirmName] = useState("");
  const [deleting, setDeleting] = useState(false);

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
    if (!reward.message.trim()) { setRewardError("Add a reward message."); return; }
    setRewardError("");
    setBusy(true);
    const res = await fetch("/api/rewards", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentId: student.id, ...reward }),
    });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) { push(json.error || "Failed to give reward.", "error"); return; }
    push(reward.notify ? (json.emailed ? "Reward given and emailed." : "Reward saved (email failed).") : "Reward given.", "success");
    const { data } = await supabase.from("rewards").select("*").eq("student_id", student.id).order("created_at", { ascending: false });
    setRewards(data ?? []);
    setReward({ stars: 5, message: "", notify: true });
  }

  async function deleteStudent() {
    setDeleting(true);
    const res = await fetch("/api/students/delete", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentId: student.id, confirmName }),
    });
    const json = await res.json();
    setDeleting(false);
    if (!res.ok) { push(json.error || "Could not delete student.", "error"); return; }
    window.location.href = "/admin/students";
  }

  const fullName = `${student.first_name} ${student.last_name}`;

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
            {rewardError && <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-800">{rewardError}</p>}
            <label className="flex items-center gap-2 text-sm text-ink/60">
              <input type="checkbox" checked={reward.notify} onChange={e => setReward({ ...reward, notify: e.target.checked })} className="accent-gold" />
              Email the student
            </label>
            <button className="btn-gold" onClick={giveReward} disabled={busy}>
              {busy ? <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" /> : "Give reward"}
            </button>
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

      {/* Danger zone — delete learner */}
      <div className="card border-red-200 p-6">
        <h2 className="font-display text-lg font-semibold text-red-700">Danger zone</h2>
        <p className="mt-1 text-sm text-ink/55">
          Permanently delete this learner and all their records (grades, attendance, rewards,
          payment history). This cannot be undone. Use this only for learners who are no longer
          interested — otherwise <strong>deactivate</strong> instead, which keeps the record.
        </p>
        {!confirmDelete ? (
          <button className="btn-danger mt-4" onClick={() => setConfirmDelete(true)}>Delete this learner</button>
        ) : (
          <div className="mt-4 space-y-3 rounded-xl border border-red-200 bg-red-50 p-4">
            <p className="text-sm font-semibold text-red-900">
              Type the learner's full name <strong>{fullName}</strong> to confirm:
            </p>
            <input className="field" value={confirmName} onChange={e => setConfirmName(e.target.value)} placeholder={fullName} />
            <div className="flex gap-2">
              <button className="btn-ghost flex-1" onClick={() => { setConfirmDelete(false); setConfirmName(""); }}>Cancel</button>
              <button className="btn-danger flex-1"
                disabled={deleting || confirmName.trim().toLowerCase() !== fullName.trim().toLowerCase()}
                onClick={deleteStudent}>{deleting ? "Deleting…" : "Permanently delete"}</button>
            </div>
          </div>
        )}
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
