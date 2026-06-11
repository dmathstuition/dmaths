import { supabaseServer } from "@/lib/supabase/server";
import ReportsClient from "@/components/admin/ReportsClient";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const supa = supabaseServer();
  const [{ data: students }, { data: submissions }, { data: attendance }] = await Promise.all([
    supa.from("profiles").select("*").eq("role", "student").order("avg_score", { ascending: false }),
    supa.from("assignment_submissions")
      .select("*, assignment:assignments(subject)")
      .order("id", { ascending: false }),
    supa.from("attendance_records").select("*"),
  ]);
  return (
    <ReportsClient
      students={students ?? []}
      submissions={submissions ?? []}
      attendance={attendance ?? []}
    />
  );
}
