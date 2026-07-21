import ReportCardsClient from "@/components/admin/ReportCardsClient";
import { supabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AdminReportCardsPage() {
  const supa = supabaseServer();
  const [{ data: students }, { data: cards }, { data: classes }] = await Promise.all([
    supa.from("profiles").select("id, first_name, last_name, student_code")
      .eq("role", "student").eq("is_active", true).order("first_name", { ascending: true }),
    supa.from("report_cards").select("id, student_id, term, issued_at, serial")
      .order("issued_at", { ascending: false }).limit(200),
    supa.from("classes").select("id, subject, starts_at").order("starts_at", { ascending: false }).limit(80),
  ]);

  const nameById = new Map((students ?? []).map((s: any) => [s.id, `${s.first_name ?? ""} ${s.last_name ?? ""}`.trim()]));
  const issued = (cards ?? []).map((c: any) => ({ ...c, student_name: nameById.get(c.student_id) ?? "Student" }));

  return <ReportCardsClient students={students ?? []} classes={(classes ?? []) as any[]} issued={issued} />;
}
