import { supabaseServer } from "@/lib/supabase/server";
import ProgressClient from "@/components/portal/ProgressClient";
import { getUser, getProfile } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function ProgressPage() {
  const user = await getUser();
  const supa = supabaseServer();
  const [profile, { data: submissions }, { data: history }, { data: attendance }] = await Promise.all([
    getProfile(),
    supa.from("assignment_submissions")
      .select("*, assignment:assignments(title, subject, type)")
      .eq("student_id", user!.id)
      .order("id", { ascending: true }),
    supa.from("grade_history")
      .select("*")
      .eq("student_id", user!.id)
      .order("graded_at", { ascending: true }),
    supa.from("attendance_records")
      .select("*")
      .eq("student_id", user!.id)
      .order("session_date", { ascending: true }),
  ]);
  // Consistency grid: any day the learner attended, submitted work, or focused.
  const { data: study } = await supa.from("study_sessions").select("created_at");
  const activityDates: string[] = [
    ...(attendance ?? []).filter((a: any) => a.present).map((a: any) => String(a.session_date).slice(0, 10)),
    ...(submissions ?? []).filter((s: any) => s.submitted_at).map((s: any) => String(s.submitted_at).slice(0, 10)),
    ...(study ?? []).map((s: any) => String(s.created_at).slice(0, 10)),
  ];

  return (
    <ProgressClient
      activityDates={activityDates}
      profile={profile}
      submissions={submissions ?? []}
      history={history ?? []}
      attendanceRecords={attendance ?? []}
      gradeTarget={profile?.grade_target ?? null}
    />
  );
}
