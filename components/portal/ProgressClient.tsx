"use client";
import { useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, CartesianGrid, PieChart, Pie, Cell, Legend } from "recharts";

const COLORS = ["#1A60AB", "#EFAE56", "#059669", "#dc2626", "#8b5cf6", "#ec4899"];

export default function ProgressClient({
  profile, submissions, attendanceRecords,
}: {
  profile: any;
  submissions: any[];
  attendanceRecords: any[];
}) {
  // ── Score trend over time ──
  const scoreTrend = useMemo(() => {
    const graded = submissions
      .filter(s => s.status === "graded" && s.grade !== null)
      .sort((a, b) => new Date(a.submitted_at || a.id).getTime() - new Date(b.submitted_at || b.id).getTime());

    let running = 0;
    return graded.map((s, i) => {
      running += s.grade;
      return {
        label: s.assignment?.title?.slice(0, 15) || `#${i + 1}`,
        score: s.grade,
        avg: Math.round(running / (i + 1)),
        subject: s.assignment?.subject || "",
      };
    });
  }, [submissions]);

  // ── Subject breakdown ──
  const subjectBreakdown = useMemo(() => {
    const map: Record<string, { sum: number; count: number; scores: number[] }> = {};
    submissions.filter(s => s.status === "graded" && s.grade !== null).forEach(s => {
      const subj = s.assignment?.subject || "Unknown";
      if (!map[subj]) map[subj] = { sum: 0, count: 0, scores: [] };
      map[subj].sum += s.grade;
      map[subj].count++;
      map[subj].scores.push(s.grade);
    });
    return Object.entries(map).map(([subject, d]) => ({
      subject,
      avg: Math.round(d.sum / d.count),
      count: d.count,
      best: Math.max(...d.scores),
      worst: Math.min(...d.scores),
    }));
  }, [submissions]);

  // ── Assignment completion rate ──
  const total = submissions.length;
  const completed = submissions.filter(s => s.status !== "pending").length;
  const graded = submissions.filter(s => s.status === "graded").length;
  const pending = submissions.filter(s => s.status === "pending").length;
  const completionPie = [
    { name: "Graded", value: graded },
    { name: "Submitted", value: submissions.filter(s => s.status === "submitted").length },
    { name: "Pending", value: pending },
  ].filter(d => d.value > 0);

  // ── Attendance trend ──
  const attendanceTrend = useMemo(() => {
    const sorted = [...attendanceRecords].sort((a, b) =>
      new Date(a.session_date).getTime() - new Date(b.session_date).getTime()
    );
    let present = 0;
    let total = 0;
    return sorted.map(r => {
      total++;
      if (r.present) present++;
      return {
        date: new Date(r.session_date).toLocaleDateString("en-NG", { day: "numeric", month: "short" }),
        present: r.present ? 1 : 0,
        cumulative: Math.round((present / total) * 100),
      };
    });
  }, [attendanceRecords]);

  return (
    <div className="space-y-6">
      <div className="boardgrid relative overflow-hidden rounded-2xl bg-board p-7 text-white">
        <h1 className="font-display text-2xl font-semibold sm:text-3xl">My progress</h1>
        <p className="mt-1 text-sm text-white/50">{profile.first_name} {profile.last_name} · {profile.student_code}</p>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPI label="Average score" value={`${profile.avg_score}%`}
          color={profile.avg_score >= 70 ? "text-emerald-600" : profile.avg_score >= 50 ? "text-amber-600" : "text-red-600"} />
        <KPI label="Attendance" value={`${profile.attendance}%`}
          color={profile.attendance >= 70 ? "text-emerald-600" : "text-amber-600"} />
        <KPI label="Completed" value={`${completed}/${total}`} sub={`${pending} pending`} />
        <KPI label="Stars" value={`${profile.stars}/5`} sub="tutor rating" />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Score trend */}
        <div className="card p-6">
          <h2 className="mb-4 font-display text-lg font-semibold">Score trend</h2>
          {scoreTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={scoreTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} angle={-20} textAnchor="end" height={50} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Line type="monotone" dataKey="score" stroke="#EFAE56" strokeWidth={2} dot={{ r: 4 }} name="Score" />
                <Line type="monotone" dataKey="avg" stroke="#1A60AB" strokeWidth={2} strokeDasharray="5 5" dot={false} name="Running avg" />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="py-8 text-center text-sm text-ink/40">No graded assignments yet.</p>
          )}
        </div>

        {/* Completion breakdown */}
        <div className="card p-6">
          <h2 className="mb-4 font-display text-lg font-semibold">Assignment completion</h2>
          {completionPie.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={completionPie} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                  {completionPie.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="py-8 text-center text-sm text-ink/40">No assignments yet.</p>
          )}
        </div>

        {/* Subject breakdown */}
        <div className="card p-6">
          <h2 className="mb-4 font-display text-lg font-semibold">Performance by subject</h2>
          {subjectBreakdown.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={subjectBreakdown}>
                <XAxis dataKey="subject" tick={{ fontSize: 10 }} angle={-20} textAnchor="end" height={50} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="avg" fill="#7BA3CA" radius={[6, 6, 0, 0]} name="Avg score" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="py-8 text-center text-sm text-ink/40">No graded assignments yet.</p>
          )}
        </div>

        {/* Attendance trend */}
        <div className="card p-6">
          <h2 className="mb-4 font-display text-lg font-semibold">Attendance over time</h2>
          {attendanceTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={attendanceTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} unit="%" />
                <Tooltip />
                <Line type="monotone" dataKey="cumulative" stroke="#059669" strokeWidth={2} name="Cumulative %" />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="py-8 text-center text-sm text-ink/40">No attendance records yet.</p>
          )}
        </div>
      </div>

      {/* Subject detail cards */}
      {subjectBreakdown.length > 0 && (
        <>
          <h2 className="font-display text-lg font-semibold">Subject details</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {subjectBreakdown.map(sb => (
              <div key={sb.subject} className="card p-5">
                <h3 className="font-extrabold">{sb.subject}</h3>
                <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="font-display text-xl font-semibold text-blue-600">{sb.avg}%</p>
                    <p className="text-[10px] font-bold text-ink/40">Average</p>
                  </div>
                  <div>
                    <p className="font-display text-xl font-semibold text-emerald-600">{sb.best}%</p>
                    <p className="text-[10px] font-bold text-ink/40">Best</p>
                  </div>
                  <div>
                    <p className="font-display text-xl font-semibold text-red-500">{sb.worst}%</p>
                    <p className="text-[10px] font-bold text-ink/40">Lowest</p>
                  </div>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-ink/10">
                  <div className="h-full rounded-full bg-gold transition-all" style={{ width: `${sb.avg}%` }} />
                </div>
                <p className="mt-2 text-xs text-ink/40">{sb.count} graded assignment{sb.count !== 1 ? "s" : ""}</p>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function KPI({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="card p-5">
      <p className="text-[11px] font-extrabold uppercase tracking-wider text-ink/40">{label}</p>
      <p className={`mt-2 font-display text-3xl font-semibold ${color || ""}`}>{value}</p>
      {sub && <p className="mt-1 text-xs text-ink/40">{sub}</p>}
    </div>
  );
}
