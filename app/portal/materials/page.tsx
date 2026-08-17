import { supabaseServer } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth";
import StudentMaterialsClient from "@/components/portal/StudentMaterialsClient";
import { contentMatchesSubjects } from "@/lib/subjects";

export const dynamic = "force-dynamic";

export default async function StudentMaterials() {
  const supa = supabaseServer();
  const [profile, { data: materials }] = await Promise.all([
    getProfile(),
    supa.from("lesson_materials").select("*").order("created_at", { ascending: false }),
  ]);

  // Match by academy subject, so content tagged with a legacy name (Algebra…)
  // still shows for a learner whose subject is the new one (Maths).
  const mySubjects = profile?.subjects ?? [];
  const filtered = (materials ?? []).filter(m => contentMatchesSubjects(m.subject, mySubjects));

  return <StudentMaterialsClient materials={filtered} subjects={mySubjects} />;
}
