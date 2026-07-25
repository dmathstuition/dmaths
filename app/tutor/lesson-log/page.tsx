import LessonLogClient from "@/components/admin/LessonLogClient";
import { getUser } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function TutorLessonLogPage() {
  const user = await getUser();
  const uid = user?.id ?? "";
  const admin = supabaseAdmin();

  const { data: classes } = await admin.from("classes")
    .select("id, subject, starts_at, tutor").eq("tutor_id", uid)
    .order("starts_at", { ascending: false }).limit(120);

  const ids = (classes ?? []).map((c: any) => c.id);
  const { data: notes } = ids.length
    ? await admin.from("lesson_notes")
        .select("id, class_id, subject, topic, notes, homework, taught_on")
        .in("class_id", ids).order("taught_on", { ascending: false }).limit(300)
    : { data: [] as any[] };

  const labelById = new Map((classes ?? []).map((c: any) => [c.id, c.subject]));
  const entries = (notes ?? []).map((n: any) => ({ ...n, class_label: labelById.get(n.class_id) ?? n.subject ?? "Class" }));

  return <LessonLogClient classes={(classes ?? []) as any[]} entries={entries} />;
}
