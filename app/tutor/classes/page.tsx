import { getUser } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import TutorClassesClient from "@/components/tutor/TutorClassesClient";

export const dynamic = "force-dynamic";

// The tutor's assigned classes, with rosters for attendance-taking.
export default async function TutorClasses() {
  const user = await getUser();
  const { data: classes } = user
    ? await supabaseAdmin()
        .from("classes")
        .select("*, class_students(student_id, student:profiles(first_name, last_name))")
        .eq("tutor_id", user.id)
        .order("starts_at", { ascending: true })
    : { data: [] };

  return <TutorClassesClient initialClasses={classes ?? []} />;
}
