import { supabaseServer } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth";
import StudentMaterialsClient from "@/components/portal/StudentMaterialsClient";

export const dynamic = "force-dynamic";

export default async function StudentMaterials() {
  const supa = supabaseServer();
  const [profile, { data: materials }] = await Promise.all([
    getProfile(),
    supa.from("lesson_materials").select("*").order("created_at", { ascending: false }),
  ]);

  const mySubjects = profile?.subjects ?? [];
  const filtered = mySubjects.length
    ? (materials ?? []).filter(m => mySubjects.includes(m.subject))
    : (materials ?? []);

  return <StudentMaterialsClient materials={filtered} subjects={mySubjects} />;
}
