import type { supabaseAdmin } from "@/lib/supabase/admin";

// Accumulate per-(subject, topic) correct/total for a learner. Called from the
// practice & mock grading routes. Best-effort: a failure (e.g. the table isn't
// migrated yet) must never break grading, so everything is wrapped and silent.
export async function recordTopicMastery(
  admin: ReturnType<typeof supabaseAdmin>,
  studentId: string,
  items: { subject: string; topic: string; correct: number; total: number }[],
): Promise<void> {
  const rows = items.filter((i) => i.subject && i.topic && i.total > 0);
  if (!rows.length) return;
  try {
    // Read current tallies for these topics, then upsert the merged totals.
    const { data: existing } = await admin
      .from("topic_mastery")
      .select("subject, topic, correct, total")
      .eq("student_id", studentId)
      .in("topic", Array.from(new Set(rows.map((r) => r.topic))));

    const key = (s: string, t: string) => `${s} ${t}`;
    const ex = new Map((existing ?? []).map((r: any) => [key(r.subject, r.topic), r]));

    const merged = rows.map((r) => {
      const e = ex.get(key(r.subject, r.topic));
      return {
        student_id: studentId,
        subject: r.subject,
        topic: r.topic,
        correct: (e?.correct ?? 0) + r.correct,
        total: (e?.total ?? 0) + r.total,
        updated_at: new Date().toISOString(),
      };
    });

    await admin.from("topic_mastery").upsert(merged, { onConflict: "student_id,subject,topic" });
  } catch {
    /* mastery tracking is best-effort — never fail the grade over it */
  }
}
