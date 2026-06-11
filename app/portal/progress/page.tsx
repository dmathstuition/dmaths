import { supabaseServer } from "@/lib/supabase/server";
import ProgressClient from "@/components/portal/ProgressClient";

export const dynamic = "force-dynamic";

export default async function ProgressPage() {
  const supa = supabaseServer();
  const { data: { user } } = await supa.auth.getUser();
  const [{ data: profile }, { data: submissions }, { data: attendance }] = await Promise.all([
    supa.from("profiles").select("*").eq("id", user!.id).single(),
    supa.from("assignment_submissions")
      .select("*, assignment:assignments(title, subject, type)")
      .eq("student_id", user!.id)
      .order("id", { ascending: true }),
    supa.from("attendance_records")
      .select("*")
      .eq("student_id", user!.id)
      .order("session_date", { ascending: true }),
  ]);
  return (
    <ProgressClient
      profile={profile}
      submissions={submissions ?? []}
      attendanceRecords={attendance ?? []}
    />
  );
}
