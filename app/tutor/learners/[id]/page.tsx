import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { staffCanAccessStudent, requireStaff } from "@/lib/authRole";
import { supabaseAdmin } from "@/lib/supabase/admin";
import TutorLearnerView from "@/components/tutor/TutorLearnerView";

export const dynamic = "force-dynamic";

// Read-only learner profile for a tutor: basic info + progress. Access is
// guarded — a tutor may only open learners within their own roster.
export default async function TutorLearnerDetail({ params }: { params: { id: string } }) {
  const staff = await requireStaff();
  if (!staff) redirect("/login");
  const allowed = await staffCanAccessStudent(staff, params.id);
  if (!allowed) redirect("/tutor/learners");

  const admin = supabaseAdmin();
  const [{ data: student }, { data: rewards }, { data: subs }, { data: behaviorTypes }, { data: behaviorLogs }] = await Promise.all([
    admin.from("profiles").select("*").eq("id", params.id).single(),
    admin.from("rewards").select("*").eq("student_id", params.id).order("created_at", { ascending: false }).limit(10),
    admin.from("assignment_submissions")
      .select("status, grade, submitted_at, assignment:assignments(title, subject)")
      .eq("student_id", params.id)
      .order("submitted_at", { ascending: true }),
    admin.from("behavior_types").select("*").eq("is_active", true).order("sort_order"),
    admin.from("behavior_logs").select("*").eq("student_id", params.id).order("created_at", { ascending: false }).limit(30),
  ]);
  if (!student) redirect("/tutor/learners");

  return (
    <TutorLearnerView
      student={student}
      rewards={rewards ?? []}
      subs={subs ?? []}
      behaviorTypes={behaviorTypes ?? []}
      initialBehaviorLogs={behaviorLogs ?? []}
      meId={staff.id}
      canMessage={staff.role === "tutor"}
    />
  );
}
