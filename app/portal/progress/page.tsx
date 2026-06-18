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
  return (
    <ProgressClient
      profile={profile}
      submissions={submissions ?? []}
      history={history ?? []}
      attendanceRecords={attendance ?? []}
    />
  );
}
