import AttendanceClient from "@/components/admin/AttendanceClient";
import { getUser } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function TutorAttendancePage() {
  const user = await getUser();
  const uid = user?.id ?? "";
  const admin = supabaseAdmin();
  const today = new Date().toISOString().split("T")[0];

  // Only the classes assigned to this tutor, and only their rosters.
  const { data: classes } = await admin
    .from("classes").select("id, subject, tutor, starts_at, mode, location")
    .eq("tutor_id", uid).order("starts_at", { ascending: true });

  const classIds = (classes ?? []).map((c: any) => c.id);
  const [{ data: classStudents }, { data: todayRecords }] = await Promise.all([
    classIds.length
      ? admin.from("class_students").select("class_id, student_id").in("class_id", classIds)
      : Promise.resolve({ data: [] as any[] }),
    classIds.length
      ? admin.from("attendance_records").select("class_id, student_id, present, late")
          .in("class_id", classIds).eq("session_date", today)
      : Promise.resolve({ data: [] as any[] }),
  ]);

  const studentIds = Array.from(new Set((classStudents ?? []).map((cs: any) => cs.student_id)));
  const { data: students } = studentIds.length
    ? await admin.from("profiles").select("id, first_name, last_name").in("id", studentIds)
    : { data: [] as any[] };

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
