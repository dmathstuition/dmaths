import AptitudeAdminClient from "@/components/admin/AptitudeAdminClient";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function AdminAptitudePage() {
  const admin = supabaseAdmin();

  const { data: students } = await admin
    .from("profiles").select("id, first_name, last_name, student_code, level")
    .eq("role", "student").eq("is_active", true).order("first_name", { ascending: true });

  let tests: any[] = [];
  let needsMigration = false;
  const { data, error } = await admin
    .from("aptitude_tests")
    .select("id, student_id, level, exam_target, questions, status, scheduled_at, score, total, ai_analysis, report, created_at, submitted_at")
    .order("created_at", { ascending: false }).limit(300);
  if (error) needsMigration = /relation .*aptitude_tests/i.test(error.message);
  else tests = data ?? [];

  // Attach a display name to each test.
  const nameById = new Map((students ?? []).map((s: any) => [s.id, `${s.first_name ?? ""} ${s.last_name ?? ""}`.trim() || s.student_code || "Student"]));
  const withNames = tests.map((t) => ({ ...t, student_name: nameById.get(t.student_id) ?? "Student" }));

  return <AptitudeAdminClient students={(students ?? []) as any[]} initialTests={withNames} needsMigration={needsMigration} />;
}
