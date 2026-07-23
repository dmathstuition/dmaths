import AtRiskClient from "@/components/admin/AtRiskClient";
import { supabaseServer } from "@/lib/supabase/server";
import { assessRisk } from "@/lib/atRisk";

export const dynamic = "force-dynamic";

export default async function AtRiskPage() {
  const supa = supabaseServer();
  const today = new Date().toISOString().slice(0, 10);

  const [{ data: students }, { data: overdueAssignments }] = await Promise.all([
    supa.from("profiles")
      .select("id, first_name, last_name, student_code, level, avg_score, attendance, sanction_points")
      .eq("role", "student").eq("is_active", true),
    supa.from("assignments").select("id").lt("due_date", today),
  ]);

  // Count each student's overdue (pending, past-due) assignments.
  const overdueIds = (overdueAssignments ?? []).map((a: any) => a.id);
  const overdueByStudent = new Map<string, number>();
  if (overdueIds.length) {
    const { data: pend } = await supa.from("assignment_submissions")
      .select("student_id").eq("status", "pending").in("assignment_id", overdueIds);
    for (const p of pend ?? []) overdueByStudent.set(p.student_id, (overdueByStudent.get(p.student_id) ?? 0) + 1);
  }

  const flagged = (students ?? []).map((s: any) => {
    const overdue = overdueByStudent.get(s.id) ?? 0;
    const r = assessRisk({
      avgScore: s.avg_score ?? 0, attendance: s.attendance ?? 0,
      overdue, sanctionPoints: s.sanction_points ?? 0,
    });
    return {
      id: s.id, name: `${s.first_name ?? ""} ${s.last_name ?? ""}`.trim() || "Student",
      code: s.student_code, level: s.level, avgScore: s.avg_score ?? 0, attendance: s.attendance ?? 0,
      overdue, ...r,
    };
  })
    .filter((s) => s.level !== "none")
    .sort((a, b) => b.score - a.score);

  return <AtRiskClient flagged={flagged} totalActive={students?.length ?? 0} />;
}
