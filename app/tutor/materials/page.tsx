import { getUser } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import TutorMaterialsClient from "@/components/tutor/TutorMaterialsClient";

export const dynamic = "force-dynamic";

// Materials this tutor has posted (learners see them in their portal alongside
// the admin's). Kept to their own uploads so the list stays manageable.
export default async function TutorMaterials() {
  const user = await getUser();
  const { data } = user
    ? await supabaseAdmin().from("lesson_materials").select("*")
        .eq("uploaded_by", user.id).order("created_at", { ascending: false })
    : { data: [] };
  return <TutorMaterialsClient initial={data ?? []} />;
}
