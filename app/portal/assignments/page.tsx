import { supabaseServer } from "@/lib/supabase/server";
import AssignmentsClient from "@/components/portal/AssignmentsClient";
import { getUser } from "@/lib/auth";
import Tour from "@/components/tour/Tour";
import { assignmentsTour } from "@/components/tour/steps";

export const dynamic = "force-dynamic";

export default async function AssignmentsPage() {
  const user = await getUser();
  const supa = supabaseServer();
  const { data } = await supa
    .from("assignment_submissions")
    .select("*, assignment:assignments(*)")
    .eq("student_id", user!.id)
    .order("id", { ascending: false });
  return (
    <>
      <AssignmentsClient initial={data ?? []} />
      <Tour tourId="student-assignments" steps={assignmentsTour} />
    </>
  );
}
