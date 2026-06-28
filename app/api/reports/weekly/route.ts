import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email";
import { siteBaseUrl } from "@/lib/siteUrl";

export async function POST() {
  const supa = supabaseServer();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: me } = await supa.from("profiles").select("role").eq("id", user.id).single();
  if (me?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const admin = supabaseAdmin();
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [{ data: students }, { data: allLogs }, { data: allTypes }, { data: allSubs }] = await Promise.all([
    admin.from("profiles")
      .select("id,first_name,last_name,email,guardian_email,reward_points,sanction_points")
      .eq("role", "student"),
    admin.from("behavior_logs")
      .select("student_id,behavior_type_id")
      .gte("created_at", weekAgo),
    admin.from("behavior_types").select("id,points,category,name"),
    admin.from("assignment_submissions")
      .select("student_id,grade,assignment:assignments(title,subject)")
      .eq("status", "graded")
      .gte("submitted_at", weekAgo),
  ]);

  const typeMap = new Map((allTypes ?? []).map((t: any) => [t.id, t]));

  const logsByStudent = new Map<string, any[]>();
  for (const log of allLogs ?? []) {
    const arr = logsByStudent.get(log.student_id) ?? [];
    arr.push(log);
    logsByStudent.set(log.student_id, arr);
  }

  const subsByStudent = new Map<string, any[]>();
  for (const sub of allSubs ?? []) {
    const arr = subsByStudent.get(sub.student_id) ?? [];
    arr.push(sub);
    subsByStudent.set(sub.student_id, arr);
  }

  const loginUrl = `${siteBaseUrl()}/login`;
  let sent = 0;

  for (const student of students ?? []) {
    const logs = logsByStudent.get(student.id) ?? [];
    const subs = subsByStudent.get(student.id) ?? [];

    let weeklyRewardPts = 0, weeklySanctionPts = 0, positiveCount = 0, negativeCount = 0;
    for (const log of logs) {
      const t = typeMap.get(log.behavior_type_id) as any;
      if (!t) continue;
      if (t.points > 0) { weeklyRewardPts += t.points; positiveCount++; }
      else { weeklySanctionPts += t.points; negativeCount++; }
    }

    const emailData = {
      firstName: student.first_name,
      rewardPoints: student.reward_points ?? 0,
      sanctionPoints: student.sanction_points ?? 0,
      weeklyRewardPts,
      weeklySanctionPts,
      positiveCount,
      negativeCount,
      gradedCount: subs.length,
      loginUrl,
    };

    if (student.email) {
      await sendEmail("weekly_report", student.email, emailData);
      sent++;
    }

    if (student.guardian_email) {
      await sendEmail("weekly_report", student.guardian_email, {
        ...emailData,
        isGuardian: true,
        studentName: `${student.first_name} ${student.last_name}`,
      });
    }
  }

  await admin.from("audit_log").insert({
    actor_id: user.id,
    action: "send_weekly_reports",
    detail: { sent, weekAgo },
  });

  return NextResponse.json({ ok: true, sent });
}
