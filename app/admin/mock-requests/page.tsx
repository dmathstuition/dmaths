import { supabaseServer } from "@/lib/supabase/server";
import MockRequestsClient from "@/components/admin/MockRequestsClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "Mock requests · D-Maths" };

export default async function AdminMockRequestsPage() {
  const supa = supabaseServer();
  const { data: students } = await supa
    .from("profiles")
    .select("id, first_name, last_name, student_code, level")
    .eq("role", "student").eq("is_active", true)
    .order("first_name", { ascending: true })
    .limit(2000);
  return <MockRequestsClient students={(students ?? []) as any} />;
}
