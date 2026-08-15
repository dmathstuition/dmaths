import { redirect } from "next/navigation";
import { requireStaff, getRoster } from "@/lib/authRole";
import { supabaseAdmin } from "@/lib/supabase/admin";
import MockRequestsClient from "@/components/admin/MockRequestsClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "Mock requests · D-Maths" };

// Tutors get the same approve/launch screen, scoped to their own roster — the
// API also filters reads/launches to the roster, so this is defence in depth.
export default async function TutorMockRequestsPage() {
  const staff = await requireStaff();
  if (!staff) redirect("/login");
  const admin = supabaseAdmin();

  const rosterIds = staff.role === "admin" ? null : await getRoster(staff.id);
  let q = admin.from("profiles")
    .select("id, first_name, last_name, student_code, level")
    .eq("role", "student").eq("is_active", true)
    .order("first_name", { ascending: true }).limit(2000);
  if (rosterIds) q = q.in("id", rosterIds.length ? rosterIds : ["00000000-0000-0000-0000-000000000000"]);
  const { data: students } = await q;

  return <MockRequestsClient students={(students ?? []) as any} />;
}
