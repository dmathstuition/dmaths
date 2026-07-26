import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getProfile } from "@/lib/auth";
import { sendEmail } from "@/lib/email";
import { loginUrl } from "@/lib/siteUrl";
import { claimEmailSend, emailLogReady, EMAIL_LOG_MISSING } from "@/lib/emailOnce";
import { cronOk } from "@/lib/cronRun";

// Emails every learner who still hasn't submitted something due tomorrow.
//
// Two ways in:
//   GET  — a cron job, authenticated with ?key=<CRON_SECRET> or an
//          Authorization: Bearer header (same as the other reminder crons).
//   POST — the "Send reminders" button in Admin → Assignments.
//
// Either way a learner is emailed at most ONCE per day: each send claims a row
// in email_log first. Cron mode refuses to run at all until that table exists,
// because an unguarded schedule set to "every minute" would email children's
// families every minute.
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  const header = req.headers.get("authorization")?.trim();
  const keyParam = new URL(req.url).searchParams.get("key")?.trim();
  const authorized = !!secret && (header === `Bearer ${secret}` || keyParam === secret);
  if (!authorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = supabaseAdmin();
  if (!(await emailLogReady(admin))) {
    return NextResponse.json({ error: EMAIL_LOG_MISSING }, { status: 503 });
  }
  return run(admin, true, "assignments");
}

export async function POST() {
  const profile = await getProfile();
  if (!profile || profile.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return run(supabaseAdmin(), false, null);
}

async function run(supa: ReturnType<typeof supabaseAdmin>, guarded: boolean, job: string | null) {
  // Find assignments due tomorrow (date only comparison)
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dateStr = tomorrow.toISOString().slice(0, 10);

  const { data: assignments } = await supa
    .from("assignments")
    .select("id, title, subject, due_date")
    .eq("due_date", dateStr);

  if (!assignments?.length) {
    return reply(supa, job, { sent: 0, message: "No assignments due tomorrow." });
  }

  const { data: subs } = await supa
    .from("assignment_submissions")
    .select("assignment_id, student:profiles(email, first_name)")
    .eq("status", "pending")
    .in("assignment_id", assignments.map(a => a.id));

  if (!subs?.length) {
    return reply(supa, job, { sent: 0, message: "All students have already submitted." });
  }

  const assignmentMap = Object.fromEntries(assignments.map(a => [a.id, a]));

  let sent = 0, skipped = 0;
  for (const sub of subs) {
    const student = sub.student as any;
    const assignment = assignmentMap[sub.assignment_id];
    if (!student?.email || !assignment) continue;

    // One reminder per learner per assignment per day.
    const claim = await claimEmailSend(supa, "assignment_reminder", student.email, String(assignment.id));
    if (claim === "already") { skipped++; continue; }
    if (claim === "unavailable" && guarded) { skipped++; continue; }

    const ok = await sendEmail("assignment_reminder", student.email, {
      firstName: student.first_name,
      assignmentTitle: assignment.title,
      subject: assignment.subject,
      dueDate: new Date(assignment.due_date).toLocaleDateString("en-NG", { timeZone: "Africa/Lagos", dateStyle: "medium" }),
      loginUrl: loginUrl(),
    });
    if (ok) sent++;
  }

  return reply(supa, job, { sent, skipped, total: subs.length });
}

// Only a cron run is a heartbeat; the admin button pressing this is not a
// scheduled job and shouldn't make a dead cron look alive.
function reply(supa: ReturnType<typeof supabaseAdmin>, job: string | null, payload: Record<string, unknown>) {
  return job ? cronOk(supa, job, payload) : NextResponse.json(payload);
}
