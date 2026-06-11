import { supabaseServer } from "@/lib/supabase/server";
import AssignmentsClient from "@/components/admin/AssignmentsClient";

export const dynamic = "force-dynamic";

export default async function AssignmentsPage() {
  const supa = supabaseServer();
  const [{ data: s }, { data: st }] = await Promise.all([
    supa.from("assignment_submissions")
      .select("*, assignment:assignments(*), student:profiles(first_name,last_name,student_code)")
      .order("id", { ascending: false }),
    supa.from("profiles").select("id,first_name,last_name,level").eq("role", "student").eq("is_active", true),
  ]);
  return <AssignmentsClient initialSubs={s ?? []} initialStudents={st ?? []} />;
}
