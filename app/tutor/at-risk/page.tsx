import AtRiskClient from "@/components/admin/AtRiskClient";
import { getUser } from "@/lib/auth";
import { getRoster } from "@/lib/authRole";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { assessRisk } from "@/lib/atRisk";

export const dynamic = "force-dynamic";

export default async function TutorAtRiskPage() {
  const user = await getUser();
  const uid = user?.id ?? "";
  const admin = supabaseAdmin();
  const today = new Date().toISOString().slice(0, 10);

  const rosterIds = uid ? await getRoster(uid) : [];
  if (!rosterIds.length) return <AtRiskClient flagged={[]} totalActive={0} basePath="/tutor/learners" />;

  const [{ data: students }, { data: overdueAssignments }] = await Promise.all([
    admin.from("profiles")
      .select("id, first_name, last_name, student_code, level, avg_score, attendance, sanction_points")
      .in("id", rosterIds).eq("is_active", true),
    admin.from("assignments").select("id").lt("due_date", today),
  ]);

  const overdueIds = (overdueAssignments ?? []).map((a: any) => a.id);
  const overdueByStudent = new Map<string, number>();
  if (overdueIds.length) {
    const { data: pend } = await admin.from("assignment_submissions")
      .select("student_id").eq("status", "pending").in("assignment_id", overdueIds).in("student_id", rosterIds);
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
  }).filter((s) => s.level !== "none").sort((a, b) => b.score - a.score);

  return <AtRiskClient flagged={flagged} totalActive={students?.length ?? 0} basePath="/tutor/learners" />;
}
