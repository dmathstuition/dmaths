import { supabaseServer } from "@/lib/supabase/server";
import ApplicationsClient from "@/components/admin/ApplicationsClient";

export const dynamic = "force-dynamic";

export default async function ApplicationsPage() {
  const supa = supabaseServer();
  const { data } = await supa.from("applications").select("*").order("created_at", { ascending: false });
  return <ApplicationsClient initial={data ?? []} />;
}
