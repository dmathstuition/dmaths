"use client";
import { useState, useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Legend } from "recharts";

const COLORS = ["#1A60AB", "#EFAE56", "#7BA3CA", "#059669", "#dc2626", "#8b5cf6", "#ec4899", "#f59e0b", "#06b6d4", "#84cc16"];

export default function ReportsClient({
  students, submissions, attendance,
}: {
  students: any[];
  submissions: any[];
  attendance: any[];
}) {
  const [tab, setTab] = useState<"overview" | "students" | "subjects">("overview");

  // ── Overview stats ──
  const totalStudents = students.length;
  const activeStudents = students.filter(s => s.is_active).length;
  const avgScore = totalStudents ? Math.round(students.reduce((a, s) => a + s.avg_score, 0) / totalStudents) : 0;
  const avgAttendance = totalStudents ? Math.round(students.reduce((a, s) => a + s.attendance, 0) / totalStudents) : 0;
  const totalSubmissions = submissions.length;
  const gradedSubmissions = submissions.filter(s => s.status === "graded").length;
  const pendingSubmissions = submissions.filter(s => s.status === "pending").length;

  // ── Score distribution ──
  const scoreDistribution = useMemo(() => {
    const ranges = [
      { range: "0-20", min: 0, max: 20, count: 0 },
      { range: "21-40", min: 21, max: 40, count: 0 },
      { range: "41-60", min: 41, max: 60, count: 0 },
      { range: "61-80", min: 61, max: 80, count: 0 },
      { range: "81-100", min: 81, max: 100, count: 0 },
    ];
    students.forEach(s => {
      const r = ranges.find(r => s.avg_score >= r.min && s.avg_score <= r.max);
      if (r) r.count++;
    });
    return ranges;
  }, [students]);

  // ── Subject performance ──
  const subjectPerf = useMemo(() => {
    const map: Record<string, { total: number; sum: number; count: number }> = {};
    submissions.filter(s => s.status === "graded" && s.grade !== null).forEach(s => {
      const subj = s.assignment?.subject || "Unknown";
      if (!map[subj]) map[subj] = { total: 0, sum: 0, count: 0 };
      map[subj].total++;
      map[subj].sum += s.grade;
      map[subj].count++;
    });
    return Object.entries(map).map(([subject, d]) => ({
      subject,
      avg: Math.round(d.sum / d.count),
      graded: d.count,
    })).sort((a, b) => b.avg - a.avg);
  }, [submissions]);

  // ── Submission status breakdown ──
  const statusPie = [
    { name: "Graded", value: gradedSubmissions },
    { name: "Submitted", value: submissions.filter(s => s.status === "submitted").length },
    { name: "Pending", value: pendingSubmissions },
  ].filter(d => d.value > 0);

  // ── Level distribution ──
  const levelData = useMemo(() => {
    const map: Record<string, number> = {};
    students.forEach(s => { map[s.level || "Unknown"] = (map[s.level || "Unknown"] || 0) + 1; });
    return Object.entries(map).map(([level, count]) => ({ level, count }));
  }, [students]);

  // ── Top performers ──
  const topStudents = useMemo(() =>
    [...students].sort((a, b) => b.avg_score - a.avg_score).slice(0, 10),
    [students]);

  // ── At-risk students (score < 40 or attendance < 50) ──
  const atRisk = useMemo(() =>
    students.filter(s => s.avg_score < 40 || s.attendance < 50).sort((a, b) => a.avg_score - b.avg_score),
    [students]);

  // ── CSV export ──
  function exportCSV() {
    const headers = ["Student Code", "Name", "Level", "Subjects", "Avg Score", "Attendance", "Status", "Assignments Graded", "Assignments Pending"];
    const rows = students.map(s => {
      const sSubs = submissions.filter(sub => sub.student_id === s.id);
      return [
        s.student_code, `${s.first_name} ${s.last_name}`, s.level,
        (s.subjects || []).join("; "), s.avg_score, `${s.attendance}%`,
        s.is_active ? "Active" : "Inactive",
        sSubs.filter(sub => sub.status === "graded").length,
        sSubs.filter(sub => sub.status === "pending").length,
      ];
    });
    const esc = (v: any) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const csv = [headers, ...rows].map(r => r.map(esc).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = "data:text/csv;charset=utf-8,\uFEFF" + encodeURIComponent(csv);
    a.download = `dmaths-report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold">Reports</h1>
          <p className="text-sm text-ink/45">Learner performance and analytics</p>
        </div>
        <button className="btn-gold" onClick={exportCSV}>Export full report</button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {(["overview", "students", "subjects"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`rounded-full px-4 py-1.5 text-[13px] font-bold capitalize ${tab === t ? "bg-ink text-white" : "bg-white border border-line text-ink/60"}`}>
            {t}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <>
          {/* KPI cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KPI label="Total learners" value={totalStudents} sub={`${activeStudents} active`} />
            <KPI label="Avg score" value={`${avgScore}%`} sub="across all students" color={avgScore >= 60 ? "text-emerald-600" : "text-amber-600"} />
            <KPI label="Avg attendance" value={`${avgAttendance}%`} sub="across all sessions" color={avgAttendance >= 70 ? "text-emerald-600" : "text-amber-600"} />
            <KPI label="Assignments" value={totalSubmissions} sub={`${gradedSubmissions} graded · ${pendingSubmissions} pending`} />
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            {/* Score distribution */}
            <div className="card p-6">
              <h2 className="mb-4 font-display text-lg font-semibold">Score distribution</h2>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={scoreDistribution}>
                  <XAxis dataKey="range" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#EFAE56" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Submission status */}
            <div className="card p-6">
              <h2 className="mb-4 font-display text-lg font-semibold">Submission status</h2>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={statusPie} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                    {statusPie.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Level distribution */}
            <div className="card p-6">
              <h2 className="mb-4 font-display text-lg font-semibold">Students by level</h2>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={levelData} layout="vertical">
                  <XAxis type="number" tick={{ fontSize: 12 }} allowDecimals={false} />
                  <YAxis dataKey="level" type="category" tick={{ fontSize: 12 }} width={80} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#1A60AB" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Subject averages */}
            <div className="card p-6">
              <h2 className="mb-4 font-display text-lg font-semibold">Subject averages</h2>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={subjectPerf}>
                  <XAxis dataKey="subject" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" height={60} />
                  <YAxis tick={{ fontSize: 12 }} domain={[0, 100]} />
                  <Tooltip />
                  <Bar dataKey="avg" fill="#1A60AB" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* At-risk students */}
          {atRisk.length > 0 && (
            <div className="card overflow-hidden">
              <div className="border-b border-line bg-red-50 px-6 py-4">
                <h2 className="font-display text-lg font-semibold text-red-900">At-risk learners</h2>
                <p className="text-xs text-red-900/60">Score below 40% or attendance below 50%</p>
              </div>
              <div className="divide-y divide-line/60">
                {atRisk.map(s => (
                  <div key={s.id} className="flex flex-wrap items-center justify-between gap-2 px-6 py-3 text-sm">
                    <div>
                      <p className="font-bold">{s.first_name} {s.last_name}</p>
                      <p className="text-xs text-ink/40">{s.student_code} · {s.level}</p>
                    </div>
                    <div className="flex gap-3">
                      <span className={`pill ${s.avg_score < 40 ? "pill-red" : "pill-green"}`}>Score: {s.avg_score}%</span>
                      <span className={`pill ${s.attendance < 50 ? "pill-red" : "pill-green"}`}>Attend: {s.attendance}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {tab === "students" && (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[780px] text-sm">
            <thead>
              <tr className="bg-chalk text-left text-[11px] uppercase tracking-wider text-ink/40">
                <th className="px-5 py-3">#</th><th className="px-5 py-3">Student</th><th className="px-5 py-3">ID</th>
                <th className="px-5 py-3">Level</th><th className="px-5 py-3">Avg score</th>
                <th className="px-5 py-3">Attendance</th><th className="px-5 py-3">Graded</th><th className="px-5 py-3">Pending</th>
              </tr>
            </thead>
            <tbody>
              {topStudents.map((s, i) => {
                const sSubs = submissions.filter(sub => sub.student_id === s.id);
                return (
                  <tr key={s.id} className="border-t border-line/60">
                    <td className="px-5 py-3 font-mono text-xs text-ink/40">{i + 1}</td>
                    <td className="px-5 py-3 font-bold">{s.first_name} {s.last_name}</td>
                    <td className="px-5 py-3 font-mono text-xs">{s.student_code}</td>
                    <td className="px-5 py-3 text-ink/60">{s.level}</td>
                    <td className="px-5 py-3">
                      <span className={`font-extrabold ${s.avg_score >= 70 ? "text-emerald-600" : s.avg_score >= 50 ? "text-amber-600" : "text-red-600"}`}>
                        {s.avg_score}%
                      </span>
                    </td>
                    <td className="px-5 py-3 text-ink/60">{s.attendance}%</td>
                    <td className="px-5 py-3">{sSubs.filter(sub => sub.status === "graded").length}</td>
                    <td className="px-5 py-3">{sSubs.filter(sub => sub.status === "pending").length}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {tab === "subjects" && (
        <div className="grid gap-4 md:grid-cols-2">
          {subjectPerf.map(sp => (
            <div key={sp.subject} className="card p-6">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-display text-lg font-semibold">{sp.subject}</h3>
                  <p className="text-sm text-ink/45">{sp.graded} graded submissions</p>
                </div>
                <span className={`font-display text-2xl font-bold ${sp.avg >= 70 ? "text-emerald-600" : sp.avg >= 50 ? "text-amber-600" : "text-red-600"}`}>
                  {sp.avg}%
                </span>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-ink/10">
                <div className="h-full rounded-full bg-gold transition-all" style={{ width: `${sp.avg}%` }} />
              </div>
            </div>
          ))}
          {!subjectPerf.length && <div className="card p-12 text-center text-ink/40 md:col-span-2">No graded assignments yet.</div>}
        </div>
      )}
    </div>
  );
}

function KPI({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div className="card p-5">
      <p className="text-[11px] font-extrabold uppercase tracking-wider text-ink/40">{label}</p>
      <p className={`mt-2 font-display text-3xl font-semibold ${color || ""}`}>{value}</p>
      {sub && <p className="mt-1 text-xs text-ink/40">{sub}</p>}
    </div>
  );
}
