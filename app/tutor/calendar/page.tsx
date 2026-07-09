import { supabaseServer } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth";
import CalendarPage from "@/components/CalendarPage";

export const dynamic = "force-dynamic";

// Weekly schedule of the tutor's own classes. RLS already scopes classes to
// tutor_id = auth.uid(); the explicit filter keeps the admin-preview honest too.
export default async function TutorCalendar() {
  const user = await getUser();
  const supa = supabaseServer();
  const { data: classes } = await supa.from("classes").select("*").eq("tutor_id", user?.id ?? "");
  return <CalendarPage classes={classes ?? []} assignments={[]} title="My Calendar" />;
}
