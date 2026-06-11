import { supabaseServer } from "@/lib/supabase/server";
import MaterialsClient from "@/components/admin/MaterialsClient";

export const dynamic = "force-dynamic";

export default async function MaterialsPage() {
  const supa = supabaseServer();
  const { data } = await supa.from("lesson_materials").select("*").order("created_at", { ascending: false });
  return <MaterialsClient initial={data ?? []} />;
}
