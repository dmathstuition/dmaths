import { supabaseServer } from "@/lib/supabase/server";
import TutorsClient from "@/components/admin/TutorsClient";

export const dynamic = "force-dynamic";

export default async function AdminTutors({ searchParams }: { searchParams: { t?: string } }) {
  const supa = supabaseServer();
  const [{ data: tutors }, { data: students }, { data: linkRows }] = await Promise.all([
    supa.from("profiles").select("id, first_name, last_name, email").eq("role", "tutor").order("first_name"),
    supa.from("profiles").select("id, first_name, last_name, level").eq("role", "student").eq("is_active", true).order("first_name"),
    supa.from("teacher_students").select("teacher_id, student_id"),
  ]);

  // Group direct assignments by tutor.
  const links: Record<string, string[]> = {};
  (linkRows ?? []).forEach((r: any) => {
    (links[r.teacher_id] ??= []).push(r.student_id);
  });

  return (
    <TutorsClient
      initialTutors={tutors ?? []}
      students={students ?? []}
      initialLinks={links}
      initialSelected={searchParams?.t}
    />
  );
}
