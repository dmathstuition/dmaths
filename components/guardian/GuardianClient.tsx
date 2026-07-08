import ProgressRing from "@/components/ui/ProgressRing";

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
      {/* Student header hero */}
      <div data-tour="hero" className="boardgrid text-crisp relative overflow-hidden rounded-2xl p-6 text-white"
        style={{ background: "linear-gradient(135deg, #10406F 0%, #0A2A4F 60%, #071C36 100%)" }}>
        <div className="aurora pointer-events-none absolute inset-0 opacity-25" />
        {/* contrast guard: keeps the text side dark no matter what effects render */}
        <div className="pointer-events-none absolute inset-0"
          style={{ background: "linear-gradient(100deg, rgba(7,25,48,.82) 0%, rgba(7,25,48,.35) 55%, rgba(7,25,48,0) 100%)" }} />
        <div className="relative flex items-center gap-4">
          <span className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-white/10 font-display text-lg font-bold text-gold-soft">
            {student.first_name?.[0]}{student.last_name?.[0]}
          </span>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-white/40">Your child's progress</p>
            <h1 className="font-display text-2xl font-semibold">{student.first_name} {student.last_name}</h1>
            <p className="mt-0.5 text-sm text-white/55">{student.student_code} · {student.level}</p>
          </div>
        </div>

        <div data-tour="rings" className="relative mt-6 flex flex-wrap items-center gap-6">
          <div className="flex flex-col items-center gap-1.5">
            <ProgressRing value={student.avg_score} size={84} stroke={8} color="#EFAE56" track="rgba(255,255,255,.14)">
              <span className="font-display text-lg font-bold text-white">{student.avg_score}%</span>
            </ProgressRing>
            <p className="text-[11px] font-bold uppercase tracking-wider text-white/45">Avg grade</p>
          </div>
          <div className="flex flex-col items-center gap-1.5">
            <ProgressRing value={student.attendance} size={84} stroke={8} color="#7BA3CA" track="rgba(255,255,255,.14)">
              <span className="font-display text-lg font-bold text-white">{student.attendance}%</span>
            </ProgressRing>
            <p className="text-[11px] font-bold uppercase tracking-wider text-white/45">Attendance</p>
          </div>
          <div className="flex gap-3">
            <div className="glass-hero-chip px-4 py-3 text-center">
              <p className="font-display text-2xl font-semibold text-emerald-300">+{student.reward_points}</p>
              <p className="text-[10px] font-bold uppercase tracking-wider text-white/45">Reward pts</p>
            </div>
            <div className="glass-hero-chip px-4 py-3 text-center">
              <p className="font-display text-2xl font-semibold text-red-300">{student.sanction_points}</p>
              <p className="text-[10px] font-bold uppercase tracking-wider text-white/45">Sanctions</p>
            </div>
          </div>
        </div>
      </div>

      {student.grade_target !== null && (
        <div className="card neu-card flex items-center gap-4 p-4">
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
      <div data-tour="behaviour" className="card neu-card hovlift p-5">
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
      <div data-tour="grades" className="card neu-card hovlift p-5">
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
