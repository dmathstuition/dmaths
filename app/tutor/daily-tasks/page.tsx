import DailyTasksClient from "@/components/admin/DailyTasksClient";
import { getUser } from "@/lib/auth";
import { getRoster } from "@/lib/authRole";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function TutorDailyTasksPage() {
  const user = await getUser();
  const uid = user?.id ?? "";
  const admin = supabaseAdmin();
  const rosterIds = uid ? await getRoster(uid) : [];

  const [{ data: students }, { data: classes }, { data: tasks }] = await Promise.all([
    rosterIds.length
      ? admin.from("profiles").select("id, first_name, last_name, student_code, level, subjects").in("id", rosterIds).order("first_name")
      : Promise.resolve({ data: [] as any[] }),
    admin.from("classes").select("id, subject, starts_at").eq("tutor_id", uid).order("starts_at", { ascending: false }).limit(60),
    admin.from("daily_tasks").select("id, title, batch_id, done, created_at").eq("created_by", uid).order("created_at", { ascending: false }).limit(300),
  ]);

  const levels = Array.from(new Set((students ?? []).map((s: any) => s.level).filter(Boolean))).sort() as string[];
  const subjects = Array.from(new Set((students ?? []).flatMap((s: any) => s.subjects ?? []).filter(Boolean))).sort() as string[];

  const byBatch = new Map<string, any>();
  for (const t of tasks ?? []) {
    const key = t.batch_id ?? t.id;
    const b = byBatch.get(key) ?? { title: t.title, created_at: t.created_at, done: 0, total: 0, batch_id: t.batch_id };
    b.total++; if (t.done) b.done++;
    byBatch.set(key, b);
  }

  return (
    <DailyTasksClient
      students={(students ?? []) as any[]}
      levels={levels} subjects={subjects}
      classes={(classes ?? []) as any[]}
      batches={Array.from(byBatch.values())}
    />
  );
}
