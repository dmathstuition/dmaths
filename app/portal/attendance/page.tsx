import { supabaseServer } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth";
import AttendanceClient from "@/components/portal/AttendanceClient";

export const dynamic = "force-dynamic";

export default async function AttendancePage() {
  const me = await getProfile();
  const supa = supabaseServer();

  const { data: records } = await supa
    .from("attendance_records")
    .select("session_date, present")
    .eq("student_id", me!.id)
    .order("session_date", { ascending: true });

  return (
    <AttendanceClient
      records={records ?? []}
      attendance={me?.attendance ?? 0}
    />
  );
}
