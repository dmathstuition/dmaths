import { getUser } from "@/lib/auth";
import { getRoster } from "@/lib/authRole";
import { supabaseAdmin } from "@/lib/supabase/admin";
import TutorClassesClient from "@/components/tutor/TutorClassesClient";

export const dynamic = "force-dynamic";

// The tutor's assigned classes, with rosters for attendance-taking.
export default async function TutorClasses() {
  const user = await getUser();
  const admin = supabaseAdmin();
  const { data: classes } = user
    ? await admin
        .from("classes")
        .select("*, class_students(student_id, student:profiles(first_name, last_name))")
        .eq("tutor_id", user.id)
        .order("starts_at", { ascending: true })
    : { data: [] };

  // Learners this tutor may put on a class (the API enforces the same list).
  const rosterIds = user ? await getRoster(user.id) : [];
  const { data: learners } = rosterIds.length
    ? await admin.from("profiles").select("id, first_name, last_name").in("id", rosterIds).order("first_name")
    : { data: [] as any[] };
  const roster = (learners ?? []).map((l: any) => ({
    id: l.id, name: `${l.first_name ?? ""} ${l.last_name ?? ""}`.trim() || "Learner",
  }));

  return <TutorClassesClient initialClasses={classes ?? []} roster={roster} />;
}
