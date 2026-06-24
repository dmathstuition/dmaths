import { supabaseServer } from "@/lib/supabase/server";
import AttendanceClient from "@/components/admin/AttendanceClient";

export const dynamic = "force-dynamic";

export default async function AttendancePage() {
  const supa = supabaseServer();
  const today = new Date().toISOString().split("T")[0];

  const [{ data: classes }, { data: classStudents }, { data: students }, { data: todayRecords }] = await Promise.all([
    supa.from("classes").select("id, name, subject, level, starts_at").order("starts_at", { ascending: true }),
    supa.from("class_students").select("class_id, student_id"),
    supa.from("profiles").select("id, first_name, last_name").eq("role", "student").eq("is_active", true),
    supa.from("attendance_records").select("class_id, student_id, present").eq("session_date", today),
  ]);

  return (
    <AttendanceClient
      classes={classes ?? []}
      classStudents={classStudents ?? []}
      students={students ?? []}
      initialDate={today}
      initialRecords={todayRecords ?? []}
    />
  );
}
