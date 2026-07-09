import { supabaseServer } from "@/lib/supabase/server";
import ClassesClient from "@/components/admin/ClassesClient";

export const dynamic = "force-dynamic";

export default async function ClassesPage() {
  const supa = supabaseServer();
  const [{ data: c }, { data: s }, { data: t }] = await Promise.all([
    supa.from("classes").select("*, class_students(student_id)").order("starts_at", { ascending: true }),
    supa.from("profiles").select("id,first_name,last_name,level").eq("role", "student").eq("is_active", true),
    supa.from("profiles").select("id,first_name,last_name").eq("role", "tutor").order("first_name"),
  ]);
  return <ClassesClient initialClasses={c ?? []} initialStudents={s ?? []} initialTutors={t ?? []} />;
}
