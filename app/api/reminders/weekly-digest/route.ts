import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email";
import { notifyUser } from "@/lib/notify";
import { loginUrl } from "@/lib/siteUrl";

// Automated weekly progress digest. Call on a weekly schedule (a free
// cron-job.org job) with ?key=<CRON_SECRET> or an Authorization: Bearer header
// — same auth as the class-reminder cron. Each active learner gets a PUSH
// summary (new grades · average · 🔥 streak) plus the existing weekly_report
// email (reused, so no Apps Script change). Idempotent via last_digest_at.
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  const header = req.headers.get("authorization")?.trim();
  const key = new URL(req.url).searchParams.get("key")?.trim();
  if (!secret || (header !== `Bearer ${secret}` && key !== secret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = supabaseAdmin();
  const weekAgoMs = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const weekAgo = new Date(weekAgoMs).toISOString();
  const sixDaysAgo = Date.now() - 6 * 24 * 60 * 60 * 1000;

  const [{ data: students }, { data: logs }, { data: types }, { data: subs }] = await Promise.all([
    admin.from("profiles")
      .select("id,first_name,last_name,email,guardian_email,avg_score,reward_points,sanction_points,streak_count,last_digest_at,is_active")
      .eq("role", "student").eq("is_active", true),
    admin.from("behavior_logs").select("student_id,behavior_type_id").gte("created_at", weekAgo),
    admin.from("behavior_types").select("id,points"),
    admin.from("assignment_submissions").select("student_id,grade").eq("status", "graded").gte("submitted_at", weekAgo),
  ]);

  const typeMap = new Map((types ?? []).map((t: any) => [t.id, t]));
  const logsBy = new Map<string, any[]>();
  for (const l of logs ?? []) { const a = logsBy.get(l.student_id) ?? []; a.push(l); logsBy.set(l.student_id, a); }
  const subsBy = new Map<string, number[]>();
  for (const s of subs ?? []) { const a = subsBy.get(s.student_id) ?? []; a.push(s.grade); subsBy.set(s.student_id, a); }

  let pushed = 0, emailed = 0;
  for (const st of students ?? []) {
    // Idempotency: skip anyone digested in the last 6 days.
    if (st.last_digest_at && new Date(st.last_digest_at).getTime() > sixDaysAgo) continue;

    const grades = subsBy.get(st.id) ?? [];
    const gradedCount = grades.length;
    const streak = st.streak_count ?? 0;

    let weeklyRewardPts = 0, weeklySanctionPts = 0, positiveCount = 0, negativeCount = 0;
    for (const l of logsBy.get(st.id) ?? []) {
      const t = typeMap.get(l.behavior_type_id) as any;
      if (!t) continue;
      if (t.points > 0) { weeklyRewardPts += t.points; positiveCount++; }
      else { weeklySanctionPts += t.points; negativeCount++; }
    }

    // Push summary
    const parts = [
      gradedCount ? `${gradedCount} new grade${gradedCount > 1 ? "s" : ""}` : null,
      `${st.avg_score ?? 0}% average`,
      streak > 0 ? `🔥 ${streak}-day streak` : null,
    ].filter(Boolean);
    await notifyUser(admin, st.id, {
      title: "Your week at D-Maths 📊",
      body: parts.join(" · "),
      link: "/portal/progress",
    });
    pushed++;

    // Email (reuses the existing weekly_report template) — best-effort.
    if (st.email) {
      const ok = await sendEmail("weekly_report", st.email, {
        firstName: st.first_name,
        rewardPoints: st.reward_points ?? 0,
        sanctionPoints: st.sanction_points ?? 0,
        weeklyRewardPts, weeklySanctionPts, positiveCount, negativeCount,
        gradedCount, loginUrl: loginUrl(),
      });
      if (ok) emailed++;
    }

    await admin.from("profiles").update({ last_digest_at: new Date().toISOString() }).eq("id", st.id);
  }

  return NextResponse.json({ ok: true, pushed, emailed, students: students?.length ?? 0 });
}
