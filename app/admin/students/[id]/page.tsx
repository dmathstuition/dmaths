import { supabaseServer } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import StudentDetailClient from "@/components/admin/StudentDetailClient";

export const dynamic = "force-dynamic";

export default async function StudentDetail({ params }: { params: { id: string } }) {
  const supa = supabaseServer();
  const [{ data: student }, { data: notes }, { data: rewards }, { data: subs }] = await Promise.all([
    supa.from("profiles").select("*").eq("id", params.id).single(),
    supa.from("admin_notes").select("*").eq("student_id", params.id).order("created_at", { ascending: false }),
    supa.from("rewards").select("*").eq("student_id", params.id).order("created_at", { ascending: false }),
    supa.from("assignment_submissions").select("status,grade").eq("student_id", params.id),
  ]);
  if (!student) redirect("/admin/students");
  return <StudentDetailClient student={student} initialNotes={notes ?? []} initialRewards={rewards ?? []} subs={subs ?? []} />;
}
