"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/Icons";

type Report = {
  student: { name: string; code: string; level: string };
  reward: { totalEarned: number; teacherAwarded: number; activityEarned: number; spendable: number; sanctions: number };
  mocks: {
    count: number; avgPercent: number; bestPercent: number; bestBand: string;
    byExam: { waec: number; jamb: number; quick: number };
    recent: { percent: number; band: string; subject: string; preset: string; created_at: string }[];
  };
  assignments: { total: number; submitted: number; graded: number; avgGrade: number; cbt: { graded: number; avg: number }; written: { graded: number; avg: number } };
  practice: { rounds: number; questions: number; correct: number; accuracy: number };
  attendance: { sessions: number; present: number; rate: number };
  extras: { flashcardReviews: number; streak: number; achievements: number; bossWins: number };
  viewerRole: string;
  generatedAt: string;
};

function Stat({ label, value, sub, color = "#0A2A4F" }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div className="rounded-2xl border border-line bg-white p-4 text-center">
      <p className="font-display text-2xl font-extrabold" style={{ color }}>{value}</p>
      <p className="mt-0.5 text-[11px] font-bold uppercase tracking-wide text-ink/40">{label}</p>
      {sub && <p className="mt-0.5 text-[11px] text-ink/50">{sub}</p>}
    </div>
  );
}

function Section({ icon, title, children }: { icon: string; title: string; children: React.ReactNode }) {
  return (
    <section className="card p-6">
      <h2 className="mb-4 flex items-center gap-2 font-display text-lg font-semibold text-ink">
        <Icon name={icon as any} className="h-5 w-5 text-gold-deep" /> {title}
      </h2>
      {children}
    </section>
  );
}

const fmtDate = (iso: string) => iso ? new Date(iso).toLocaleDateString("en-NG", { day: "numeric", month: "short" }) : "—";
const presetLabel = (p: string) => p === "waec" ? "WAEC" : p === "jamb" ? "JAMB" : "Quick";

export default function EngagementReport({ report }: { report: Report }) {
  const router = useRouter();
  const r = report;
  const back = r.viewerRole === "admin" || r.viewerRole === "tutor" ? "/admin/students" : r.viewerRole === "parent" ? "/parent" : "/portal";
  const rewardSplitTotal = Math.max(1, r.reward.activityEarned + r.reward.teacherAwarded);
  const actPct = Math.round((r.reward.activityEarned / rewardSplitTotal) * 100);

  return (
    <div className="mx-auto max-w-4xl space-y-6 py-2">
      {/* Header */}
      <div className="boardgrid relative overflow-hidden rounded-2xl bg-board p-7 text-white">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-gold">Engagement report</p>
            <h1 className="mt-1 font-display text-2xl font-semibold sm:text-3xl">{r.student.name}</h1>
            <p className="mt-1 text-sm text-white/50">{r.student.code} · {r.student.level} · generated {r.generatedAt}</p>
          </div>
          <div className="flex gap-2 print:hidden">
            <button onClick={() => router.push(back)} className="rounded-xl bg-white/10 px-3 py-2 text-sm font-bold text-white hover:bg-white/20">← Back</button>
            <button onClick={() => window.print()} className="rounded-xl bg-gold px-3 py-2 text-sm font-bold text-board hover:brightness-105">Print / PDF</button>
          </div>
        </div>
      </div>

      {/* Reward economy */}
      <Section icon="coins" title="Reward points">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Total earned" value={r.reward.totalEarned} color="#C8881F" />
          <Stat label="Earned in activities" value={r.reward.activityEarned} sub="practice, mocks, streaks…" color="#059669" />
          <Stat label="Awarded by teachers" value={r.reward.teacherAwarded} sub="for good conduct" color="#1A60AB" />
          <Stat label="Spendable now" value={r.reward.spendable} sub="after redemptions" color="#0A2A4F" />
        </div>
        <div className="mt-4">
          <div className="mb-1 flex justify-between text-[11px] font-bold text-ink/50">
            <span>How the total was earned</span>
            {r.reward.sanctions > 0 && <span className="text-red-600">− {r.reward.sanctions} conduct deductions</span>}
          </div>
          <div className="flex h-3 overflow-hidden rounded-full bg-chalk" title={`${actPct}% activities / ${100 - actPct}% teacher`}>
            <div className="h-full bg-emerald-500" style={{ width: `${actPct}%` }} />
            <div className="h-full bg-[#1A60AB]" style={{ width: `${100 - actPct}%` }} />
          </div>
          <div className="mt-1.5 flex gap-4 text-[11px] font-semibold text-ink/55">
            <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Activities {r.reward.activityEarned}</span>
            <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-[#1A60AB]" /> Teacher {r.reward.teacherAwarded}</span>
          </div>
        </div>
      </Section>

      {/* Mocks */}
      <Section icon="graduationCap" title="Mock exams">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Mocks taken" value={r.mocks.count} />
          <Stat label="Average score" value={`${r.mocks.avgPercent}%`} color="#059669" />
          <Stat label="Best" value={r.mocks.count ? `${r.mocks.bestPercent}%` : "—"} sub={r.mocks.count ? `Grade ${r.mocks.bestBand}` : undefined} color="#C8881F" />
          <Stat label="By paper" value={`${r.mocks.byExam.waec}·${r.mocks.byExam.jamb}·${r.mocks.byExam.quick}`} sub="WAEC · JAMB · Quick" />
        </div>
        {r.mocks.recent.length > 0 && (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[420px] text-left text-sm">
              <thead><tr className="border-b border-line text-[11px] font-bold uppercase tracking-wide text-ink/40">
                <th className="py-2">Date</th><th>Subject</th><th>Paper</th><th className="text-right">Score</th><th className="text-right">Grade</th>
              </tr></thead>
              <tbody>
                {r.mocks.recent.map((m, i) => (
                  <tr key={i} className="border-b border-line/60">
                    <td className="py-2 text-ink/60">{fmtDate(m.created_at)}</td>
                    <td className="font-semibold text-ink/80">{m.subject || "—"}</td>
                    <td className="text-ink/60">{presetLabel(m.preset)}</td>
                    <td className="text-right font-bold text-ink">{m.percent}%</td>
                    <td className="text-right font-bold text-gold-deep">{m.band || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!r.mocks.count && <p className="mt-3 text-sm text-ink/45">No mock exams sat yet.</p>}
      </Section>

      {/* Tests & assignments */}
      <Section icon="assignments" title="Tests & assignments">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Submitted" value={r.assignments.submitted} sub={`of ${r.assignments.total} set`} />
          <Stat label="Graded" value={r.assignments.graded} />
          <Stat label="Average grade" value={r.assignments.graded ? `${r.assignments.avgGrade}%` : "—"} color="#059669" />
          <Stat label="CBT avg" value={r.assignments.cbt.graded ? `${r.assignments.cbt.avg}%` : "—"} sub={`${r.assignments.cbt.graded} CBT · ${r.assignments.written.graded} written`} color="#1A60AB" />
        </div>
      </Section>

      {/* Practice & revision */}
      <Section icon="target" title="Practice & revision">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Practice rounds" value={r.practice.rounds} />
          <Stat label="Questions done" value={r.practice.questions} sub={`${r.practice.correct} correct`} />
          <Stat label="Practice accuracy" value={`${r.practice.accuracy}%`} color="#059669" />
          <Stat label="Cards revised" value={r.extras.flashcardReviews} />
        </div>
      </Section>

      {/* Consistency */}
      <Section icon="flame" title="Attendance & consistency">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Attendance" value={`${r.attendance.rate}%`} sub={`${r.attendance.present}/${r.attendance.sessions} sessions`} color="#1A60AB" />
          <Stat label="Current streak" value={`${r.extras.streak}d`} color="#C8881F" />
          <Stat label="Boss wins" value={r.extras.bossWins} />
          <Stat label="Achievements" value={r.extras.achievements} />
        </div>
      </Section>

      <div className="flex justify-between print:hidden">
        <Link href={back} className="text-sm font-bold text-ink/50 hover:text-ink">← Back</Link>
        <p className="text-xs text-ink/35">D-Maths · engagement report</p>
      </div>

      <style>{`@media print { @page { size: A4 portrait; margin: 12mm; } .card { break-inside: avoid; } }`}</style>
    </div>
  );
}
