import DailyTasksClient from "@/components/admin/DailyTasksClient";
import { supabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AdminDailyTasksPage() {
  const supa = supabaseServer();
  const now = new Date().toISOString();
  const [{ data: students }, { data: classes }, { data: tasks }] = await Promise.all([
    supa.from("profiles").select("id, first_name, last_name, student_code, level, subjects")
      .eq("role", "student").eq("is_active", true).order("first_name", { ascending: true }),
    supa.from("classes").select("id, subject, starts_at").gte("starts_at", now).order("starts_at").limit(60),
    supa.from("daily_tasks").select("id, title, batch_id, done, created_at").order("created_at", { ascending: false }).limit(400),
  ]);

  const levels = Array.from(new Set((students ?? []).map((s: any) => s.level).filter(Boolean))).sort() as string[];
  const subjects = Array.from(new Set((students ?? []).flatMap((s: any) => s.subjects ?? []).filter(Boolean))).sort() as string[];

  // Group task rows into batches (title + done/total).
  const byBatch = new Map<string, { title: string; created_at: string; done: number; total: number; batch_id: string | null }>();
  for (const t of tasks ?? []) {
    const key = t.batch_id ?? t.id;
    const b = byBatch.get(key) ?? { title: t.title, created_at: t.created_at, done: 0, total: 0, batch_id: t.batch_id };
    b.total++; if (t.done) b.done++;
    byBatch.set(key, b);
  }
  const batches = Array.from(byBatch.values());

  return (
    <DailyTasksClient
      students={(students ?? []) as any[]}
      levels={levels} subjects={subjects}
      classes={(classes ?? []) as any[]}
      batches={batches}
    />
  );
}
