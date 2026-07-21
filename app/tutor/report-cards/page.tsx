import TutorReportCardsClient from "@/components/tutor/TutorReportCardsClient";
import { getUser } from "@/lib/auth";
import { getRoster } from "@/lib/authRole";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function TutorReportCardsPage() {
  const user = await getUser();
  const uid = user?.id ?? "";
  const admin = supabaseAdmin();

  const rosterIds = uid ? await getRoster(uid) : [];
  const [{ data: students }, { data: classes }, { data: cards }] = await Promise.all([
    rosterIds.length
      ? admin.from("profiles").select("id, first_name, last_name, student_code")
          .in("id", rosterIds).order("first_name", { ascending: true })
      : Promise.resolve({ data: [] as any[] }),
    admin.from("classes").select("id, subject, starts_at").eq("tutor_id", uid)
      .order("starts_at", { ascending: false }).limit(80),
    rosterIds.length
      ? admin.from("report_cards").select("id, student_id, term, issued_at, serial")
          .in("student_id", rosterIds).order("issued_at", { ascending: false }).limit(200)
      : Promise.resolve({ data: [] as any[] }),
  ]);

  const nameById = new Map((students ?? []).map((s: any) => [s.id, `${s.first_name ?? ""} ${s.last_name ?? ""}`.trim()]));
  const issued = (cards ?? []).map((c: any) => ({ ...c, student_name: nameById.get(c.student_id) ?? "Student" }));

  return <TutorReportCardsClient students={students ?? []} classes={(classes ?? []) as any[]} issued={issued} />;
}
