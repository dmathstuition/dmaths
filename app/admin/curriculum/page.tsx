import { supabaseServer } from "@/lib/supabase/server";
import CurriculumClient from "@/components/admin/CurriculumClient";

export const dynamic = "force-dynamic";

export default async function CurriculumPage() {
  const supa = supabaseServer();
  const { data } = await supa.from("curricula").select("*").order("created_at", { ascending: false });
  return <CurriculumClient initial={data ?? []} />;
}
