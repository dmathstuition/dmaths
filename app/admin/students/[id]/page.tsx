import { supabaseServer } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import StudentDetailClient from "@/components/admin/StudentDetailClient";

export const dynamic = "force-dynamic";

export default async function StudentDetail({ params }: { params: { id: string } }) {
  const supa = supabaseServer();
  const [{ data: student }, { data: notes }, { data: rewards }, { data: subs }, { data: behaviorTypes }, { data: behaviorLogs }] = await Promise.all([
    supa.from("profiles").select("*").eq("id", params.id).single(),
    supa.from("admin_notes").select("*").eq("student_id", params.id).order("created_at", { ascending: false }),
    supa.from("rewards").select("*").eq("student_id", params.id).order("created_at", { ascending: false }),
    supa.from("assignment_submissions")
      .select("status, grade, submitted_at, assignment:assignments(title, subject)")
      .eq("student_id", params.id)
      .order("submitted_at", { ascending: true }),
    supa.from("behavior_types").select("*").eq("is_active", true).order("sort_order"),
    supa.from("behavior_logs")
      .select("*")
      .eq("student_id", params.id)
      .order("created_at", { ascending: false })
      .limit(30),
  ]);
  if (!student) redirect("/admin/students");

  // Who referred this learner (for the header badge), if anyone.
  let referredByName: string | null = null;
  if (student.referred_by) {
    const { data: referrer } = await supa
      .from("profiles").select("first_name, last_name").eq("id", student.referred_by).maybeSingle();
    if (referrer) referredByName = `${referrer.first_name ?? ""} ${referrer.last_name ?? ""}`.trim() || null;
  }

  return (
    <StudentDetailClient
      student={student}
      initialNotes={notes ?? []}
      initialRewards={rewards ?? []}
      subs={subs ?? []}
      behaviorTypes={behaviorTypes ?? []}
      initialBehaviorLogs={behaviorLogs ?? []}
      referredByName={referredByName}
    />
  );
}
