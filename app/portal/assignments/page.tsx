import { supabaseServer } from "@/lib/supabase/server";
import AssignmentsClient from "@/components/portal/AssignmentsClient";

export const dynamic = "force-dynamic";

export default async function AssignmentsPage() {
  const supa = supabaseServer();
  const { data: { user } } = await supa.auth.getUser();
  const { data } = await supa
    .from("assignment_submissions")
    .select("*, assignment:assignments(*)")
    .eq("student_id", user!.id)
    .order("id", { ascending: false });
  return <AssignmentsClient initial={data ?? []} />;
}
