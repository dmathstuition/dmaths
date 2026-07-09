"use client";
import Link from "next/link";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

// Read-only learner view for tutors: identity, headline stats, grade trend, and
// recent rewards. No admin controls (no delete, guardian, subscription, target).
export default function TutorLearnerView({ student, rewards, subs }: {
  student: any; rewards: any[]; subs: any[];
}) {
  const trendData = subs
    .filter((s) => s.status === "graded" && s.grade !== null && s.submitted_at)
    .map((s, i) => ({
      n: i + 1,
      grade: s.grade,
      label: (s.assignment?.title ?? `#${i + 1}`).slice(0, 24),
      subject: s.assignment?.subject ?? "",
    }));

  const graded = subs.filter((s) => s.status === "graded").length;
  const pending = subs.filter((s) => s.status === "pending").length;

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
          <div className="grid grid-cols-4 gap-3 text-center">
            <Stat label="Avg" value={`${student.avg_score ?? 0}%`} />
            <Stat label="Attend" value={`${student.attendance ?? 0}%`} />
            <Stat label="Stars" value={`${student.stars ?? 0}/5`} />
            <Stat label="Reward" value={`+${student.reward_points ?? 0}`} color="text-emerald-600" />
          </div>
        </div>
        <p className="mt-4 border-t border-line pt-3 text-sm text-ink/55">
          {graded} graded, {pending} pending
          {student.grade_target != null && <> · Target: {student.grade_target}%</>}
        </p>
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

      <div className="card p-6">
        <h2 className="font-display text-lg font-semibold">Recent rewards</h2>
        <div className="mt-4 space-y-2">
          {rewards.length === 0 && <p className="text-sm text-ink/35">No rewards yet.</p>}
          {rewards.map((r) => (
            <div key={r.id} className="rounded-xl bg-chalk px-4 py-2.5 text-sm">
              <span className="text-gold">{"★".repeat(r.stars ?? 0)}</span>
              <span className="ml-2 text-ink/70">{r.message}</span>
              <span className="block text-xs text-ink/35">
                {new Date(r.created_at).toLocaleDateString("en-NG", { dateStyle: "medium" })}
              </span>
            </div>
          ))}
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
