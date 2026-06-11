import { supabaseServer } from "@/lib/supabase/server";
import CalendarPage from "@/components/CalendarPage";

export const dynamic = "force-dynamic";

export default async function PortalCalendar() {
  const supa = supabaseServer();
  const { data: { user } } = await supa.auth.getUser();
  const [{ data: classes }, { data: subs }] = await Promise.all([
    supa.from("classes").select("*"),
    supa.from("assignment_submissions")
      .select("*, assignment:assignments(*)")
      .eq("student_id", user!.id),
  ]);
  const assignments = (subs ?? []).map(s => s.assignment).filter(Boolean);
  // Deduplicate assignments
  const unique = [...new Map(assignments.map(a => [a.id, a])).values()];
  return <CalendarPage classes={classes ?? []} assignments={unique} title="My calendar" />;
}
