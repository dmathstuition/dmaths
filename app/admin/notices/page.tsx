import { supabaseServer } from "@/lib/supabase/server";
import NoticesClient from "@/components/admin/NoticesClient";

export const dynamic = "force-dynamic";

export default async function NoticesPage() {
  const supa = supabaseServer();
  const { data } = await supa.from("notices").select("*").order("created_at", { ascending: false });
  return <NoticesClient initial={data ?? []} />;
}
