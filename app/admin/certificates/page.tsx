import CertificatesClient from "@/components/admin/CertificatesClient";
import { supabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AdminCertificatesPage() {
  const supa = supabaseServer();
  const [{ data: students }, { data: certs }] = await Promise.all([
    supa.from("profiles").select("id, first_name, last_name, student_code")
      .eq("role", "student").eq("is_active", true)
      .order("first_name", { ascending: true }),
    supa.from("certificates").select("id, student_id, title, subtitle, issued_at, serial")
      .order("issued_at", { ascending: false }).limit(200),
  ]);

  // Attach the learner's name to each issued certificate for display.
  const nameById = new Map((students ?? []).map((s: any) => [s.id, `${s.first_name ?? ""} ${s.last_name ?? ""}`.trim()]));
  const issued = (certs ?? []).map((c: any) => ({ ...c, student_name: nameById.get(c.student_id) ?? "Student" }));

  return <CertificatesClient students={students ?? []} issued={issued} />;
}
