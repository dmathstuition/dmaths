import LessonLogClient from "@/components/admin/LessonLogClient";
import { supabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function LessonLogPage() {
  const supa = supabaseServer();
  const [{ data: classes }, { data: notes }] = await Promise.all([
    supa.from("classes").select("id, subject, starts_at, tutor").order("starts_at", { ascending: false }).limit(120),
    // Errors harmlessly to null before the migration is run.
    supa.from("lesson_notes").select("id, class_id, subject, topic, notes, homework, taught_on")
      .order("taught_on", { ascending: false }).limit(300),
  ]);

  const labelById = new Map((classes ?? []).map((c: any) => [c.id, c.subject]));
  const entries = (notes ?? []).map((n: any) => ({ ...n, class_label: labelById.get(n.class_id) ?? n.subject ?? "Class" }));

  return <LessonLogClient classes={(classes ?? []) as any[]} entries={entries} />;
}
