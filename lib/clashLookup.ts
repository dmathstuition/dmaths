import { supabaseAdmin } from "@/lib/supabase/admin";
import { findClashes, searchWindow, type Clash, type ExistingClass } from "@/lib/clashes";

export type Candidate = {
  startsAt: string; durationMinutes: number;
  tutorId: string | null; studentIds: string[];
};

// Anything already on the timetable that would collide with these slots: the
// same tutor teaching elsewhere, or a learner on this roster sitting in another
// class. One query covers every occurrence of a series.
//
// If the lookup fails (an old database without `tutor_id`, say) we return no
// clashes rather than blocking the booking — a scheduling aid must never stop
// someone scheduling.
export async function detectClashes(
  admin: ReturnType<typeof supabaseAdmin>,
  slots: Candidate[],
  ignoreIds: string[],
): Promise<(Clash & { when: string; who?: string[] })[]> {
  const window = searchWindow(slots);
  if (!window) return [];

  const { data: rows, error } = await admin
    .from("classes")
    .select("id, subject, starts_at, duration_minutes, tutor_id")
    .gte("starts_at", window.from)
    .lte("starts_at", window.to);
  if (error || !rows?.length) return [];

  // Rosters, only when the candidate actually has learners to conflict with.
  const rosters = new Map<string, string[]>();
  if (slots.some((s) => s.studentIds.length)) {
    const { data: links } = await admin
      .from("class_students").select("class_id, student_id")
      .in("class_id", rows.map((r: any) => r.id));
    for (const l of links ?? []) {
      const list = rosters.get(l.class_id) ?? [];
      list.push(l.student_id);
      rosters.set(l.class_id, list);
    }
  }

  const existing: ExistingClass[] = rows.map((r: any) => ({
    id: r.id,
    subject: r.subject ?? "A class",
    startsAt: r.starts_at,
    durationMinutes: Number(r.duration_minutes) || 60,
    tutorId: r.tutor_id ?? null,
    studentIds: rosters.get(r.id) ?? [],
  }));

  // De-duplicate: a weekly series clashing with the same class every week only
  // needs saying once per (class, kind).
  const seen = new Set<string>();
  const out: (Clash & { when: string })[] = [];
  for (const slot of slots) {
    for (const c of findClashes(slot, existing, ignoreIds)) {
      const key = `${c.kind}:${c.classId}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ ...c, when: c.startsAt });
    }
  }

  // Names make the warning readable ("Ada and 2 others"), so resolve the ids we
  // are about to show.
  const ids = [...new Set(out.flatMap((c) => c.studentIds))];
  if (ids.length) {
    const { data: people } = await admin.from("profiles").select("id, first_name").in("id", ids);
    const nameById = new Map((people ?? []).map((p: any) => [p.id, p.first_name || "A learner"]));
    return out.map((c) => ({ ...c, who: c.studentIds.map((id) => nameById.get(id) ?? "A learner") }));
  }
  return out;
}
