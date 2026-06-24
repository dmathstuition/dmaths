import { notFound } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase/admin";
import GuardianClient from "@/components/guardian/GuardianClient";

export const dynamic = "force-dynamic";

export default async function GuardianPage({ params }: { params: { token: string } }) {
  const admin = supabaseAdmin();

  const { data: tokenRow } = await admin
    .from("guardian_tokens")
    .select("student_id, expires_at, guardian_email")
    .eq("token", params.token)
    .single();

  if (!tokenRow) notFound();

  if (new Date(tokenRow.expires_at) < new Date()) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
        <p className="text-lg font-semibold text-red-700">This link has expired.</p>
        <p className="mt-2 text-sm text-red-600">Please ask the tutor to send you a new portal link.</p>
      </div>
    );
  }

  const studentId = tokenRow.student_id;

  const [
    { data: student },
    { data: behaviorLogs },
    { data: behaviorTypes },
    { data: gradedSubs },
    { data: pendingSubs },
  ] = await Promise.all([
    admin.from("profiles")
      .select("first_name, last_name, student_code, level, avg_score, attendance, reward_points, sanction_points, grade_target")
      .eq("id", studentId).single(),
    admin.from("behavior_logs")
      .select("behavior_type_id, notes, created_at")
      .eq("student_id", studentId)
      .order("created_at", { ascending: false }).limit(5),
    admin.from("behavior_types").select("id, name, category, points"),
    admin.from("assignment_submissions")
      .select("grade, submitted_at, assignment:assignments(title, subject)")
      .eq("student_id", studentId).eq("status", "graded")
      .order("submitted_at", { ascending: false }).limit(5),
    admin.from("assignment_submissions")
      .select("id").eq("student_id", studentId).eq("status", "pending"),
  ]);

  if (!student) notFound();

  const typeMap = new Map((behaviorTypes ?? []).map((t: any) => [t.id, t]));
  const logs = (behaviorLogs ?? []).map((l: any) => ({
    ...l,
    behavior_type: typeMap.get(l.behavior_type_id) ?? null,
  }));

  return (
    <GuardianClient
      student={student as any}
      behaviorLogs={logs}
      gradedSubs={gradedSubs ?? []}
      pendingCount={pendingSubs?.length ?? 0}
    />
  );
}
