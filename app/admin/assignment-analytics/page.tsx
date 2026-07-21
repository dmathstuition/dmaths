import AssignmentAnalyticsClient from "@/components/admin/AssignmentAnalyticsClient";
import { supabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AssignmentAnalyticsPage() {
  const supa = supabaseServer();
  const [{ data: assignments }, { data: subs }] = await Promise.all([
    supa.from("assignments").select("id, title, subject, due_date").order("created_at", { ascending: false }),
    supa.from("assignment_submissions").select("assignment_id, status, grade"),
  ]);

  // Group submissions by assignment.
  const byAssignment = new Map<string, { total: number; done: number; grades: number[] }>();
  for (const s of subs ?? []) {
    const a = byAssignment.get(s.assignment_id) ?? { total: 0, done: 0, grades: [] };
    a.total++;
    if (s.status === "submitted" || s.status === "graded") a.done++;
    if (s.status === "graded" && typeof s.grade === "number") a.grades.push(s.grade);
    byAssignment.set(s.assignment_id, a);
  }

  const avg = (xs: number[]) => (xs.length ? Math.round(xs.reduce((x, y) => x + y, 0) / xs.length) : null);

  const rows = (assignments ?? []).map((a: any) => {
    const s = byAssignment.get(a.id) ?? { total: 0, done: 0, grades: [] };
    return {
      id: a.id, title: a.title, subject: a.subject || "General", due_date: a.due_date,
      targeted: s.total, completed: s.done,
      completion: s.total ? Math.round((s.done / s.total) * 100) : 0,
      average: avg(s.grades),
    };
  });

  // Aggregate per subject.
  const subjMap = new Map<string, { targeted: number; completed: number; grades: number[] }>();
  for (const a of assignments ?? []) {
    const s = byAssignment.get(a.id) ?? { total: 0, done: 0, grades: [] };
    const key = a.subject || "General";
    const acc = subjMap.get(key) ?? { targeted: 0, completed: 0, grades: [] };
    acc.targeted += s.total; acc.completed += s.done; acc.grades.push(...s.grades);
    subjMap.set(key, acc);
  }
  const subjects = [...subjMap.entries()].map(([subject, s]) => ({
    subject, targeted: s.targeted, completed: s.completed,
    completion: s.targeted ? Math.round((s.completed / s.targeted) * 100) : 0,
    average: avg(s.grades),
  })).sort((a, b) => b.targeted - a.targeted);

  return <AssignmentAnalyticsClient rows={rows} subjects={subjects} />;
}
