import { supabaseServer } from "@/lib/supabase/server";
import StudentsClient from "@/components/admin/StudentsClient";

export const dynamic = "force-dynamic";

export default async function StudentsPage() {
  const supa = supabaseServer();
  const { data } = await supa.from("profiles").select("*")
    .eq("role", "student").order("created_at", { ascending: false });
  return <StudentsClient initial={data ?? []} />;
}
