"use client";
import { useState } from "react";
import Link from "next/link";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { supabaseBrowser } from "@/lib/supabase/client";
import { useToast } from "@/components/Toast";
import { Icon, type IconName } from "@/components/Icons";

// Learner view for tutors: identity, headline stats, grade trend, plus the two
// write actions a tutor most needs — give a reward and log behaviour points.
// Every write is scoped server-side to the tutor's roster.
export default function TutorLearnerView({ student, rewards: initialRewards, subs, behaviorTypes, initialBehaviorLogs }: {
  student: any; rewards: any[]; subs: any[]; behaviorTypes: any[]; initialBehaviorLogs: any[];
}) {
  const supabase = supabaseBrowser();
  const push = useToast();
  const [rewards, setRewards] = useState<any[]>(initialRewards);
  const [rewardPoints, setRewardPoints] = useState(student.reward_points ?? 0);
  const [sanctionPoints, setSanctionPoints] = useState(student.sanction_points ?? 0);

  // Reward form
  const [reward, setReward] = useState({ stars: 5, message: "", notify: true });
  const [busy, setBusy] = useState(false);

  // Behaviour
  const [behaviorLogs, setBehaviorLogs] = useState<any[]>(initialBehaviorLogs);
  const [behaviorCategory, setBehaviorCategory] = useState<"positive" | "negative">("positive");
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [behaviorNote, setBehaviorNote] = useState("");
  const [logging, setLogging] = useState(false);
  const typeMap = new Map(behaviorTypes.map((t: any) => [t.id, t]));

  const trendData = subs
    .filter((s) => s.status === "graded" && s.grade !== null && s.submitted_at)
    .map((s, i) => ({ n: i + 1, grade: s.grade, label: (s.assignment?.title ?? `#${i + 1}`).slice(0, 24), subject: s.assignment?.subject ?? "" }));
  const graded = subs.filter((s) => s.status === "graded").length;
  const pending = subs.filter((s) => s.status === "pending").length;

  async function giveReward() {
    if (!reward.message.trim()) { push("Add a reward message.", "error"); return; }
    setBusy(true);
    const res = await fetch("/api/rewards", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentId: student.id, ...reward }),
    });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) { push(json.error || "Could not give reward.", "error"); return; }
    push(reward.notify ? "Reward given and the learner notified." : "Reward given.", "success");
    const { data } = await supabase.from("rewards").select("*").eq("student_id", student.id).order("created_at", { ascending: false }).limit(10);
    setRewards(data ?? []);
    setReward({ stars: 5, message: "", notify: true });
  }

  async function logBehavior() {
    if (!selectedType) return;
    setLogging(true);
    const res = await fetch("/api/behaviors/log", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentId: student.id, behaviorTypeId: selectedType, notes: behaviorNote }),
    });
    const json = await res.json();
    setLogging(false);
    if (!res.ok) { push(json.error || "Could not log behaviour.", "error"); return; }
    push("Behaviour logged.", "success");
    setRewardPoints(json.rewardPoints);
    setSanctionPoints(json.sanctionPoints);
    setSelectedType(null);
    setBehaviorNote("");
    const { data } = await supabase.from("behavior_logs").select("*").eq("student_id", student.id).order("created_at", { ascending: false }).limit(30);
    setBehaviorLogs(data ?? []);
  }

  async function deleteBehaviorLog(logId: string) {
    if (!window.confirm("Delete this behaviour entry?")) return;
    const res = await fetch("/api/behaviors/log", {
      method: "DELETE", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ logId }),
    });
    const json = await res.json();
    if (!res.ok) { push(json.error || "Could not delete entry.", "error"); return; }
    setBehaviorLogs((prev) => prev.filter((l) => l.id !== logId));
    setRewardPoints(json.rewardPoints);
    setSanctionPoints(json.sanctionPoints);
  }

  return (
    <div className="space-y-6 py-2">
      <Link href="/tutor/learners" className="text-sm font-semibold text-gold-deep hover:underline">← My learners</Link>

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
            <Stat label="Avg" value={`${student.avg_score ?? 0}%`} />
            <Stat label="Attend" value={`${student.attendance ?? 0}%`} />
            <Stat label="Stars" value={`${student.stars ?? 0}/5`} />
            <Stat label="Reward" value={`+${rewardPoints}`} color="text-emerald-600" />
            <Stat label="Sanction" value={sanctionPoints} color="text-red-500" />
          </div>
        </div>
        <p className="mt-4 border-t border-line pt-3 text-sm text-ink/55">
          {graded} graded, {pending} pending
          {student.grade_target != null && <> · Target: {student.grade_target}%</>}
        </p>
      </div>

      {/* Behaviour logging */}
      <div className="card p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-lg font-semibold">Log behaviour</h2>
          <div className="flex rounded-xl border border-line bg-chalk p-1">
            {(["positive", "negative"] as const).map((cat) => (
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
          {behaviorTypes.filter((bt: any) => bt.category === behaviorCategory).map((bt: any) => (
            <button key={bt.id} onClick={() => setSelectedType(bt.id === selectedType ? null : bt.id)}
              className={`flex flex-col items-center gap-1.5 rounded-2xl border p-3 text-center transition hover:shadow-md ${selectedType === bt.id ? "ring-2 shadow-md" : "border-line"}`}
              style={selectedType === bt.id ? { borderColor: bt.color, "--tw-ring-color": bt.color, background: `${bt.color}12` } as React.CSSProperties : undefined}>
              <div className="flex h-10 w-10 items-center justify-center rounded-full text-white transition"
                style={{ background: selectedType === bt.id ? bt.color : "#94a3b8" }}>
                <Icon name={bt.icon as IconName} />
              </div>
              <span className="text-[11px] font-bold leading-tight text-ink">{bt.name}</span>
              <span className="text-[10px] font-semibold" style={{ color: bt.color }}>
                {bt.points > 0 ? `+${bt.points}` : bt.points} pts
              </span>
            </button>
          ))}
        </div>
        {selectedType && (
          <div className="mt-4 space-y-2">
            <textarea className="field min-h-[60px]" placeholder="Optional note…"
              value={behaviorNote} onChange={(e) => setBehaviorNote(e.target.value)} />
            <button className="btn-gold" onClick={logBehavior} disabled={logging}>
              {logging ? "Logging…" : "Log behaviour"}
            </button>
          </div>
        )}
        <div className="mt-5 space-y-1.5 border-t border-line pt-4">
          {behaviorLogs.slice(0, 10).map((l: any) => {
            const bt = typeMap.get(l.behavior_type_id);
            const isPos = bt?.category === "positive";
            return (
              <div key={l.id} className="group flex items-center gap-3 rounded-xl bg-chalk px-3 py-2 text-sm">
                <span className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-extrabold text-white ${isPos ? "bg-emerald-500" : "bg-red-500"}`}>
                  {bt?.points > 0 ? `+${bt.points}` : bt?.points}
                </span>
                <span className="flex-1 font-semibold text-ink">{bt?.name}</span>
                {l.notes && <span className="max-w-[140px] truncate text-xs italic text-ink/40">{l.notes}</span>}
                <span className="flex-shrink-0 text-xs text-ink/35">{new Date(l.created_at).toLocaleDateString("en-NG", { dateStyle: "medium" })}</span>
                <button onClick={() => deleteBehaviorLog(l.id)}
                  className="flex-shrink-0 text-xs font-bold text-red-500 opacity-0 transition-opacity group-hover:opacity-100">Delete</button>
              </div>
            );
          })}
          {behaviorLogs.length === 0 && <p className="text-sm text-ink/35">No behaviour entries yet.</p>}
        </div>
      </div>

      {trendData.length >= 1 && (
        <div className="card p-6">
          <h2 className="mb-4 font-display text-lg font-semibold">Grade trend</h2>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={trendData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="n" tick={{ fontSize: 11 }} height={36} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
              <Tooltip
                formatter={(val: any, _: any, props: any) => [`${val}/100`, props.payload?.subject || "Grade"]}
                labelFormatter={(_: any, payload: any[]) => payload?.[0]?.payload?.label ?? ""}
              />
              <Line type="monotone" dataKey="grade" stroke="#EFAE56" strokeWidth={2.5}
                dot={{ fill: "#EFAE56", r: 4, strokeWidth: 0 }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Give a reward */}
      <div className="card p-6">
        <h2 className="font-display text-lg font-semibold">Give a reward</h2>
        <div className="mt-3 space-y-3">
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} onClick={() => setReward({ ...reward, stars: n })}
                className={`text-2xl ${n <= reward.stars ? "text-gold" : "text-ink/15"}`}>★</button>
            ))}
          </div>
          <textarea className="field min-h-16" placeholder="e.g. Excellent work on calculus this week!"
            value={reward.message} onChange={(e) => setReward({ ...reward, message: e.target.value })} />
          <label className="flex items-center gap-2 text-sm text-ink/60">
            <input type="checkbox" checked={reward.notify} onChange={(e) => setReward({ ...reward, notify: e.target.checked })} className="accent-gold" />
            Email the learner
          </label>
          <button className="btn-gold" onClick={giveReward} disabled={busy}>
            {busy ? "Saving…" : "Give reward"}
          </button>
        </div>
        <div className="mt-5 space-y-2 border-t border-line pt-4">
          {rewards.map((r) => (
            <div key={r.id} className="rounded-xl bg-chalk px-4 py-2.5 text-sm">
              <span className="text-gold">{"★".repeat(r.stars ?? 0)}</span>
              <span className="ml-2 text-ink/70">{r.message}</span>
              <span className="block text-xs text-ink/35">{new Date(r.created_at).toLocaleDateString("en-NG", { dateStyle: "medium" })}</span>
            </div>
          ))}
          {!rewards.length && <p className="text-sm text-ink/35">No rewards yet.</p>}
        </div>
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
