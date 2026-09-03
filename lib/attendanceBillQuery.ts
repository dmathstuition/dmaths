import type { SupabaseClient } from "@supabase/supabase-js";
import { computeMonthlyBill, monthKey, monthEndDate, type MonthlyBill } from "@/lib/attendanceBilling";

// Loads a learner's attendance-based bill for the reference month straight from
// the database and returns the computed figure. Shared by the portal, the
// parent view and the invoice so they all show the same live number. Resilient
// to the rate_tier column not being migrated yet (tier then defaults to
// standard) and never throws — a query hiccup just yields a zero bill.
export async function loadMonthlyBill(
  admin: SupabaseClient,
  studentId: string,
  ref: Date = new Date(),
): Promise<MonthlyBill> {
  const empty: MonthlyBill = { monthKey: monthKey(ref), sessions: 0, hours: 0, amount: 0, lines: [] };
  try {
    const first = `${monthKey(ref)}-01`;
    const last = monthEndDate(ref);
    const { data: att } = await admin
      .from("attendance_records")
      .select("present, session_date, class_id")
      .eq("student_id", studentId)
      .eq("present", true)
      .gte("session_date", first)
      .lte("session_date", last);

    const records = att ?? [];
    if (!records.length) return empty;

    const classIds = [...new Set(records.map((r: any) => r.class_id).filter(Boolean))];
    const classMap = new Map<string, { duration: number; tier: string }>();
    if (classIds.length) {
      let { data: classes, error } = await admin.from("classes").select("id, duration_minutes, rate_tier").in("id", classIds);
      if (error && /column .*rate_tier/i.test(error.message)) {
        ({ data: classes } = await admin.from("classes").select("id, duration_minutes").in("id", classIds) as any);
      }
      for (const c of classes ?? []) {
        classMap.set(c.id, { duration: Number(c.duration_minutes) || 60, tier: String((c as any).rate_tier ?? "standard") || "standard" });
      }
    }

    const sessions = records.map((r: any) => {
      const c = classMap.get(r.class_id) ?? { duration: 60, tier: "standard" };
      return { present: true, session_date: r.session_date, durationMinutes: c.duration, rateTier: c.tier };
    });
    return computeMonthlyBill(sessions, ref);
  } catch {
    return empty;
  }
}
