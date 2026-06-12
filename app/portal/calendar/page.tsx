import { supabaseServer } from "@/lib/supabase/server";
import CalendarPage from "@/components/CalendarPage";
import { getUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function PortalCalendar() {
  const user = await getUser();
  const supa = supabaseServer();
  const [{ data: classes }, { data: subs }] = await Promise.all([
    supa.from("classes").select("*"),
    supa.from("assignment_submissions")
      .select("*, assignment:assignments(*)")
      .eq("student_id", user!.id),
  ]);
  const assignments = (subs ?? []).map(s => s.assignment).filter(Boolean);
  const unique = [...new Map(assignments.map((a: any) => [a.id, a])).values()];
  return <CalendarPage classes={classes ?? []} assignments={unique} title="My calendar" />;
}
