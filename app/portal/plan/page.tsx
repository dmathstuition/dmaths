import { supabaseServer } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth";
import PlannerClient from "@/components/portal/PlannerClient";

export const dynamic = "force-dynamic";

export default async function PlanPage() {
  const user = await getUser();
  const supa = supabaseServer();
  const [{ data: tasks }, { data: subs }] = await Promise.all([
    // Errors harmlessly to null before migration-study-tasks.sql is run.
    supa.from("student_tasks").select("id, title, done, due_date, created_at")
      .eq("student_id", user!.id).order("created_at", { ascending: false }),
    supa.from("assignment_submissions")
      .select("status, assignment:assignments(id,title,subject,due_date)")
      .eq("student_id", user!.id),
  ]);

  // Upcoming (pending) assignments, soonest first — shown read-only alongside.
  const upcoming = (subs ?? [])
    .filter((s: any) => s.status === "pending" && s.assignment?.due_date)
    .map((s: any) => s.assignment)
    .sort((a: any, b: any) => String(a.due_date).localeCompare(String(b.due_date)))
    .slice(0, 8);

  return <PlannerClient studentId={user!.id} initialTasks={tasks ?? []} upcoming={upcoming} />;
}
