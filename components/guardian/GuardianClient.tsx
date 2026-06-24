interface Student {
  first_name: string; last_name: string; student_code: string; level: string;
  avg_score: number; attendance: number; reward_points: number; sanction_points: number;
  grade_target: number | null;
}
interface BehaviorLog {
  behavior_type: { name: string; category: string; points: number } | null;
  notes: string | null; created_at: string;
}
interface GradedSub {
  grade: number | null; submitted_at: string;
  assignment: { title: string; subject: string } | { title: string; subject: string }[] | null;
}

export default function GuardianClient({
  student, behaviorLogs, gradedSubs, pendingCount,
}: {
  student: Student; behaviorLogs: BehaviorLog[]; gradedSubs: GradedSub[]; pendingCount: number;
}) {
  return (
    <div className="space-y-6">
      {/* Student header */}
      <div className="rounded-2xl bg-board p-6 text-white">
        <h1 className="font-display text-2xl font-semibold">
          {student.first_name} {student.last_name}
        </h1>
        <p className="mt-1 text-sm text-white/55">
          {student.student_code} · {student.level}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Avg grade" value={`${student.avg_score}%`}
          color={student.avg_score >= 70 ? "text-emerald-600" : student.avg_score >= 50 ? "text-amber-600" : "text-red-600"} />
        <StatCard label="Attendance" value={`${student.attendance}%`}
          color={student.attendance >= 70 ? "text-emerald-600" : "text-amber-600"} />
        <StatCard label="Reward pts" value={`+${student.reward_points}`} color="text-emerald-600" />
        <StatCard label="Sanction pts" value={String(student.sanction_points)} color="text-red-500" />
      </div>

      {student.grade_target !== null && (
        <div className="card flex items-center gap-4 p-4">
          <div className="flex-1">
            <p className="text-xs font-bold uppercase tracking-wide text-ink/40">Grade target</p>
            <p className="mt-1 font-display text-xl font-semibold text-gold-deep">{student.grade_target}%</p>
          </div>
          <div className="flex-1">
            <div className="h-2.5 overflow-hidden rounded-full bg-ink/10">
              <div className="h-full rounded-full bg-gold transition-all"
                style={{ width: `${Math.min(100, Math.round((student.avg_score / student.grade_target!) * 100))}%` }} />
            </div>
            <p className="mt-1 text-xs text-ink/40">
              {student.avg_score >= student.grade_target ? "Target reached!" : `${student.grade_target - student.avg_score}% to go`}
            </p>
          </div>
        </div>
      )}

      {/* Recent behaviour */}
      <div className="card p-5">
        <h2 className="mb-4 font-display text-lg font-semibold">Recent behaviour</h2>
        {behaviorLogs.length === 0 ? (
          <p className="text-sm text-ink/40">No behaviour entries yet.</p>
        ) : (
          <div className="space-y-2">
            {behaviorLogs.map((l, i) => {
              const isPos = l.behavior_type?.category === "positive";
              const pts = l.behavior_type?.points ?? 0;
              return (
                <div key={i} className="flex items-center gap-3 rounded-xl bg-chalk px-3 py-2 text-sm">
                  <span className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-extrabold text-white ${isPos ? "bg-emerald-500" : "bg-red-500"}`}>
                    {pts > 0 ? `+${pts}` : pts}
                  </span>
                  <span className="flex-1 font-semibold text-ink">{l.behavior_type?.name ?? "—"}</span>
                  {l.notes && <span className="text-xs italic text-ink/40 truncate max-w-[120px]">{l.notes}</span>}
                  <span className="flex-shrink-0 text-xs text-ink/35">
                    {new Date(l.created_at).toLocaleDateString("en-NG", { dateStyle: "medium" })}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Recent grades */}
      <div className="card p-5">
        <h2 className="mb-4 font-display text-lg font-semibold">Recent grades</h2>
        {gradedSubs.length === 0 ? (
          <p className="text-sm text-ink/40">No graded assignments yet.</p>
        ) : (
          <div className="divide-y divide-line/60">
            {gradedSubs.map((s, i) => {
              const asgn = Array.isArray(s.assignment) ? s.assignment[0] : s.assignment;
              return (
                <div key={i} className="flex items-center justify-between py-2.5">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-ink truncate">{asgn?.title ?? "Assignment"}</p>
                    <p className="text-xs text-ink/40">{asgn?.subject}</p>
                  </div>
                  <span className={`ml-4 flex-shrink-0 font-display text-lg font-semibold ${(s.grade ?? 0) >= 70 ? "text-emerald-600" : (s.grade ?? 0) >= 50 ? "text-amber-600" : "text-red-500"}`}>
                    {s.grade}/100
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {pendingCount > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm font-semibold text-amber-800">
          {pendingCount} assignment{pendingCount !== 1 ? "s" : ""} pending submission
        </div>
      )}

      <p className="text-center text-xs text-ink/30">
        This is a read-only parent view · D-Maths Tuition
      </p>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="card p-4 text-center">
      <p className="text-[11px] font-extrabold uppercase tracking-wider text-ink/40">{label}</p>
      <p className={`mt-1 font-display text-2xl font-semibold ${color ?? ""}`}>{value}</p>
    </div>
  );
}
