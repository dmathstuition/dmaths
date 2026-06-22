"use client";
import { useState } from "react";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabase/client";
import { useToast } from "@/components/Toast";
import { Icon, type IconName } from "@/components/Icons";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

export default function StudentDetailClient({ student, initialNotes, initialRewards, subs, behaviorTypes, initialBehaviorLogs }: {
  student: any; initialNotes: any[]; initialRewards: any[]; subs: any[];
  behaviorTypes: any[]; initialBehaviorLogs: any[];
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
  const [guardianEmail, setGuardianEmail] = useState(student.guardian_email ?? "");
  const [savingGuardian, setSavingGuardian] = useState(false);

  // Behaviour state
  const [behaviorLogs, setBehaviorLogs] = useState(initialBehaviorLogs);
  const [behaviorCategory, setBehaviorCategory] = useState<"positive" | "negative">("positive");
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [behaviorNote, setBehaviorNote] = useState("");
  const [loggingBehavior, setLoggingBehavior] = useState(false);
  const [rewardPoints, setRewardPoints] = useState(student.reward_points ?? 0);
  const [sanctionPoints, setSanctionPoints] = useState(student.sanction_points ?? 0);

  const graded = subs.filter(s => s.status === "graded").length;
  const pending = subs.filter(s => s.status === "pending").length;

  async function logBehavior() {
    if (!selectedType) return;
    setLoggingBehavior(true);
    const res = await fetch("/api/behaviors/log", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentId: student.id, behaviorTypeId: selectedType, notes: behaviorNote }),
    });
    const json = await res.json();
    setLoggingBehavior(false);
    if (!res.ok) { push(json.error || "Failed to log behaviour.", "error"); return; }
    push("Behaviour logged.", "success");
    setRewardPoints(json.rewardPoints);
    setSanctionPoints(json.sanctionPoints);
    setSelectedType(null);
    setBehaviorNote("");
    const { data } = await supabase.from("behavior_logs")
      .select("*, behavior_type:behavior_types(name,category,points,icon,color)")
      .eq("student_id", student.id).order("created_at", { ascending: false }).limit(30);
    setBehaviorLogs(data ?? []);
  }

  const trendData = subs
    .filter(s => s.status === "graded" && s.grade !== null && s.submitted_at)
    .map((s, i) => ({
      n: i + 1,
      grade: s.grade,
      label: (s.assignment?.title ?? `#${i + 1}`).slice(0, 24),
      subject: s.assignment?.subject ?? "",
    }));

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

  async function saveGuardianEmail() {
    setSavingGuardian(true);
    await supabase.from("profiles").update({ guardian_email: guardianEmail.trim() }).eq("id", student.id);
    setSavingGuardian(false);
    push("Guardian email saved.", "success");
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
          <div className="grid grid-cols-5 gap-3 text-center">
            <Stat label="Avg" value={`${student.avg_score}%`} />
            <Stat label="Attend" value={`${student.attendance}%`} />
            <Stat label="Stars" value={`${student.stars}/5`} />
            <Stat label="Reward" value={`+${rewardPoints}`} color="text-emerald-600" />
            <Stat label="Sanction" value={sanctionPoints} color="text-red-500" />
          </div>
        </div>
        <p className="mt-4 border-t border-line pt-3 text-sm text-ink/55">
          {student.email} · {student.phone} · Guardian: {student.guardian_name} ({student.guardian_contact}) · {graded} graded, {pending} pending
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line pt-3">
          <label className="text-xs font-bold uppercase tracking-wide text-ink/35 shrink-0">Guardian email</label>
          <input className="field max-w-xs" type="email" placeholder="parent@example.com"
            value={guardianEmail} onChange={e => setGuardianEmail(e.target.value)} />
          <button className="btn-ghost !min-h-[36px]" onClick={saveGuardianEmail} disabled={savingGuardian}>
            {savingGuardian ? "Saving…" : "Save"}
          </button>
          <span className="text-xs text-ink/35">Used for weekly digest emails to guardian</span>
        </div>
      </div>

      {/* Behaviour logging */}
      <div className="card p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-lg font-semibold">Log behaviour</h2>
          <div className="flex rounded-xl border border-line bg-chalk p-1">
            {(["positive", "negative"] as const).map(cat => (
              <button key={cat} onClick={() => { setBehaviorCategory(cat); setSelectedType(null); }}
                className={`rounded-lg px-4 py-1.5 text-sm font-semibold capitalize transition ${behaviorCategory === cat
                  ? cat === "positive" ? "bg-emerald-500 text-white shadow" : "bg-red-500 text-white shadow"
                  : "text-ink/45 hover:text-ink"}`}>
                {cat}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {behaviorTypes.filter(bt => bt.category === behaviorCategory).map(bt => (
            <button key={bt.id} onClick={() => setSelectedType(bt.id === selectedType ? null : bt.id)}
              className={`flex flex-col items-center gap-1.5 rounded-2xl border p-3 text-center transition hover:shadow-md ${selectedType === bt.id ? "ring-2 shadow-md" : "border-line"}`}
              style={selectedType === bt.id ? { borderColor: bt.color, "--tw-ring-color": bt.color, background: `${bt.color}12` } as React.CSSProperties : undefined}>
              <div className="flex h-10 w-10 items-center justify-center rounded-full text-white transition"
                style={{ background: selectedType === bt.id ? bt.color : "#94a3b8" }}>
                <Icon name={bt.icon as IconName} />
              </div>
              <span className="text-[11px] font-bold text-ink leading-tight">{bt.name}</span>
              <span className="text-[10px] font-semibold" style={{ color: bt.color }}>
                {bt.points > 0 ? `+${bt.points}` : bt.points} pts
              </span>
            </button>
          ))}
        </div>
        {selectedType && (
          <div className="mt-4 space-y-2">
            <textarea className="field min-h-[60px]" placeholder="Optional note…"
              value={behaviorNote} onChange={e => setBehaviorNote(e.target.value)} />
            <button className="btn-gold" onClick={logBehavior} disabled={loggingBehavior}>
              {loggingBehavior ? <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" /> : "Log behaviour"}
            </button>
          </div>
        )}
        {/* Recent log */}
        <div className="mt-5 space-y-1.5 border-t border-line pt-4">
          {behaviorLogs.slice(0, 10).map((l: any) => {
            const bt = l.behavior_type;
            const isPos = bt?.category === "positive";
            return (
              <div key={l.id} className="flex items-center gap-3 rounded-xl px-3 py-2 bg-chalk text-sm">
                <span className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-extrabold text-white ${isPos ? "bg-emerald-500" : "bg-red-500"}`}>
                  {bt?.points > 0 ? `+${bt.points}` : bt?.points}
                </span>
                <span className="flex-1 font-semibold text-ink">{bt?.name}</span>
                {l.notes && <span className="text-xs text-ink/40 italic truncate max-w-[140px]">{l.notes}</span>}
                <span className="flex-shrink-0 text-xs text-ink/35">
                  {new Date(l.created_at).toLocaleDateString("en-NG", { dateStyle: "medium" })}
                </span>
              </div>
            );
          })}
          {behaviorLogs.length === 0 && <p className="text-sm text-ink/35">No behaviour entries yet.</p>}
        </div>
      </div>

      {trendData.length >= 1 && (
        <div className="card p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold">Grade trend</h2>
            <button
              onClick={() => {
                const header = "Assignment,Subject,Submitted,Grade/100,Feedback";
                const rows = subs
                  .filter(s => s.status === "graded")
                  .map(s => [
                    `"${(s.assignment?.title ?? "").replace(/"/g, '""')}"`,
                    `"${(s.assignment?.subject ?? "").replace(/"/g, '""')}"`,
                    s.submitted_at ? new Date(s.submitted_at).toLocaleDateString("en-NG") : "",
                    s.grade ?? "",
                    `"${(s.feedback ?? "").replace(/"/g, '""')}"`,
                  ].join(","));
                const csv = [header, ...rows].join("\n");
                const a = document.createElement("a");
                a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
                a.download = `${student.student_code}-grades.csv`;
                a.click();
              }}
              className="btn-ghost !min-h-[34px] !px-3 text-xs"
            >
              Export CSV
            </button>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={trendData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="n" tick={{ fontSize: 11 }} label={{ value: "Assignment", position: "insideBottom", offset: -2, fontSize: 11 }} height={36} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
              <Tooltip
                formatter={(val: any, _: any, props: any) => [`${val}/100`, props.payload?.subject || "Grade"]}
                labelFormatter={(_: any, payload: any[]) => payload?.[0]?.payload?.label ?? ""}
              />
              <Line type="monotone" dataKey="grade" stroke="#EFAE56" strokeWidth={2.5}
                dot={{ fill: "#EFAE56", r: 4, strokeWidth: 0 }}
                activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

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

function Stat({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div>
      <p className={`font-display text-xl font-semibold ${color ?? ""}`}>{value}</p>
      <p className="text-[10px] font-bold uppercase tracking-wide text-ink/40">{label}</p>
    </div>
  );
}
