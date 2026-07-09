import { getUser } from "@/lib/auth";
import { getRoster } from "@/lib/authRole";
import { supabaseAdmin } from "@/lib/supabase/admin";
import TutorAssignmentsClient from "@/components/tutor/TutorAssignmentsClient";

export const dynamic = "force-dynamic";

export default async function TutorAssignments() {
  const user = await getUser();
  const rosterIds = user ? await getRoster(user.id) : [];

  let students: any[] = [];
  let subs: any[] = [];
  if (rosterIds.length) {
    const admin = supabaseAdmin();
    const [{ data: st }, { data: s }] = await Promise.all([
      admin.from("profiles").select("id, first_name, last_name, level")
        .in("id", rosterIds).order("first_name"),
      admin.from("assignment_submissions")
        .select("*, assignment:assignments(title, subject, type, code_language, due_at, due_date), student:profiles(first_name, last_name, student_code)")
        .in("student_id", rosterIds)
        .order("id", { ascending: false }),
    ]);
    students = st ?? [];
    subs = s ?? [];
  }

  return <TutorAssignmentsClient students={students} initialSubs={subs} />;
}
