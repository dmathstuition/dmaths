"use client";
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, LabelList,
} from "recharts";
import { fmtNgn } from "@/lib/summerCamp";

type StudentRow = { avg_score?: number | null; created_at?: string | null; subjects?: string[] | null };
type PaymentRow = { amount?: number | null; paid_at?: string | null; created_at?: string | null };

// Chart colours (validated against the light chart surface):
//   students → brand blue, revenue → emerald, scores → gold-deep.
// Gold-deep sits below 3:1 contrast, so its chart carries direct value labels.
const BLUE = "#1A60AB";
const EMERALD = "#059669";
const GOLD = "#C8881F";
const TICK = { fill: "#8A93A6", fontSize: 11 } as const;
const TOOLTIP_STYLE = {
  borderRadius: 12, border: "1px solid #E5E5E0", fontSize: 12,
  boxShadow: "0 8px 24px rgba(26,96,171,.12)",
} as const;

// The last six calendar months, oldest → newest.
function lastSixMonths() {
  const months: { key: string; label: string }[] = [];
  const d = new Date();
  for (let i = 5; i >= 0; i--) {
    const m = new Date(d.getFullYear(), d.getMonth() - i, 1);
    months.push({
      key: `${m.getFullYear()}-${m.getMonth()}`,
      label: m.toLocaleDateString("en-NG", { month: "short" }),
    });
  }
  return months;
}
const monthKey = (iso: string) => {
  const d = new Date(iso);
  return `${d.getFullYear()}-${d.getMonth()}`;
};

export default function AdminCharts({ students, payments }: {
  students: StudentRow[];
  payments: PaymentRow[];
}) {
  const months = lastSixMonths();

  // 1) Enrolment growth — new students per month.
  const enrolment = months.map(({ key, label }) => ({
    month: label,
    students: students.filter((s) => s.created_at && monthKey(s.created_at) === key).length,
  }));

  // 2) Revenue — verified payments per month (₦).
  const revenue = months.map(({ key, label }) => ({
    month: label,
    naira: payments
      .filter((p) => monthKey((p.paid_at || p.created_at)!) === key)
      .reduce((a, p) => a + Number(p.amount || 0), 0),
  }));

  // 3) Score distribution — how the class average scores spread out.
  const buckets = [
    { band: "<40", min: 0, max: 39 }, { band: "40s", min: 40, max: 49 },
    { band: "50s", min: 50, max: 59 }, { band: "60s", min: 60, max: 69 },
    { band: "70s", min: 70, max: 79 }, { band: "80+", min: 80, max: 100 },
  ].map(({ band, min, max }) => ({
    band,
    count: students.filter((s) => {
      const v = Number(s.avg_score ?? -1);
      return v >= min && v <= max;
    }).length,
  }));

  // 4) Subject popularity — top subjects by enrolled students (HTML bars).
  const subjectCounts = new Map<string, number>();
  students.forEach((s) => (s.subjects ?? []).forEach((sub) => {
    subjectCounts.set(sub, (subjectCounts.get(sub) ?? 0) + 1);
  }));
  const topSubjects = [...subjectCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);
  const maxSubject = topSubjects[0]?.[1] ?? 1;

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="card neu-card p-5">
        <h2 className="font-display text-base font-semibold">Enrolment growth</h2>
        <p className="mb-3 text-xs text-ink/45">New students per month · last 6 months</p>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={enrolment} margin={{ top: 6, right: 8, left: -22, bottom: 0 }}>
            <defs>
              <linearGradient id="enrolFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={BLUE} stopOpacity={0.22} />
                <stop offset="100%" stopColor={BLUE} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="#E8E8E4" />
            <XAxis dataKey="month" tick={TICK} axisLine={false} tickLine={false} />
            <YAxis tick={TICK} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => [v, "New students"]} />
            <Area type="monotone" dataKey="students" stroke={BLUE} strokeWidth={2}
              fill="url(#enrolFill)" activeDot={{ r: 4 }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="card neu-card p-5">
        <h2 className="font-display text-base font-semibold">Revenue received</h2>
        <p className="mb-3 text-xs text-ink/45">Verified payments per month (₦) · last 6 months</p>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={revenue} margin={{ top: 6, right: 8, left: -14, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="#E8E8E4" />
            <XAxis dataKey="month" tick={TICK} axisLine={false} tickLine={false} />
            <YAxis tick={TICK} axisLine={false} tickLine={false}
              tickFormatter={(v: number) => (v >= 1000 ? `${Math.round(v / 1000)}k` : String(v))} />
            <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => [fmtNgn(v), "Received"]} />
            <Bar dataKey="naira" fill={EMERALD} radius={[4, 4, 0, 0]} maxBarSize={28} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="card neu-card p-5">
        <h2 className="font-display text-base font-semibold">Score distribution</h2>
        <p className="mb-3 text-xs text-ink/45">Students by average score band</p>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={buckets} margin={{ top: 16, right: 8, left: -22, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="#E8E8E4" />
            <XAxis dataKey="band" tick={TICK} axisLine={false} tickLine={false} />
            <YAxis tick={TICK} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => [v, "Students"]} />
            <Bar dataKey="count" fill={GOLD} radius={[4, 4, 0, 0]} maxBarSize={28}>
              {/* direct labels: required relief for gold's lower contrast */}
              <LabelList dataKey="count" position="top" style={{ fill: "#4A5568", fontSize: 11, fontWeight: 700 }} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="card neu-card p-5">
        <h2 className="font-display text-base font-semibold">Subject popularity</h2>
        <p className="mb-3 text-xs text-ink/45">Students enrolled per subject · top {topSubjects.length || 0}</p>
        {topSubjects.length === 0 ? (
          <p className="py-10 text-center text-sm text-ink/40">No subject data yet.</p>
        ) : (
          <div className="space-y-2.5">
            {topSubjects.map(([subject, count]) => (
              <div key={subject}>
                <div className="mb-1 flex items-center justify-between text-[13px]">
                  <span className="font-semibold text-ink/80">{subject}</span>
                  <span className="font-bold text-ink/50">{count}</span>
                </div>
                <div className="neu-inset h-2.5 overflow-hidden rounded-full">
                  <div className="bar-animate h-full rounded-full bg-gradient-to-r from-gold to-gold-deep"
                    style={{ width: `${Math.max(6, Math.round((count / maxSubject) * 100))}%` }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
