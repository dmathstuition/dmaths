import { supabaseServer } from "@/lib/supabase/server";
import CalendarPage from "@/components/CalendarPage";

export const dynamic = "force-dynamic";

export default async function AdminCalendar() {
  const supa = supabaseServer();
  const [{ data: classes }, { data: assignments }] = await Promise.all([
    supa.from("classes").select("*"),
    supa.from("assignments").select("*"),
  ]);
  return <CalendarPage classes={classes ?? []} assignments={assignments ?? []} title="Calendar" />;
}
