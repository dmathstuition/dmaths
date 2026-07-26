import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getProfile } from "@/lib/auth";
import { sendEmail } from "@/lib/email";
import { loginUrl } from "@/lib/siteUrl";
import { claimEmailSend, emailLogReady, EMAIL_LOG_MISSING } from "@/lib/emailOnce";
import { cronOk } from "@/lib/cronRun";

// Emails each guardian a short progress digest for their child.
//
// Two ways in:
//   GET  — a cron job, authenticated with ?key=<CRON_SECRET> or an
//          Authorization: Bearer header.
//   POST — the admin-triggered button.
//
// A guardian receives at most ONE digest per child per day: each send claims a
// row in email_log first. Cron mode refuses to run until that table exists —
// this endpoint reaches parents' inboxes, so an unguarded schedule is worse
// than no schedule.
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
  return run(admin, true, "guardian-digest");
}

export async function POST() {
  const profile = await getProfile();
  if (!profile || profile.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return run(supabaseAdmin(), false, null);
}

async function run(supa: ReturnType<typeof supabaseAdmin>, guarded: boolean, job: string | null) {
  const { data: students } = await supa
    .from("profiles")
    .select("id, first_name, last_name, student_code, level, avg_score, attendance, stars, guardian_email")
    .eq("role", "student")
    .eq("is_active", true)
    .neq("guardian_email", "")
    .not("guardian_email", "is", null);

  if (!students?.length) {
    return reply(supa, job, { sent: 0, message: "No students have a guardian email set." });
  }

  // Fetch pending submissions for upcoming due dates (next 7 days)
  const in7days = new Date();
  in7days.setDate(in7days.getDate() + 7);
  const { data: pending } = await supa
    .from("assignment_submissions")
    .select("student_id, assignment:assignments(title, subject, due_date)")
    .eq("status", "pending")
    .lte("assignment.due_date", in7days.toISOString().slice(0, 10))
    .not("assignment.due_date", "is", null);

  const pendingByStudent: Record<string, any[]> = {};
  (pending ?? []).forEach((s: any) => {
    if (!s.assignment) return;
    (pendingByStudent[s.student_id] ??= []).push(s.assignment);
  });

  let sent = 0, skipped = 0;
  for (const student of students) {
    if (!student.guardian_email) continue;

    // One digest per guardian per child per day — a guardian with two children
    // still gets a digest for each.
    const claim = await claimEmailSend(supa, "guardian_digest", student.guardian_email, String(student.id));
    if (claim === "already") { skipped++; continue; }
    if (claim === "unavailable" && guarded) { skipped++; continue; }

    const upcoming = (pendingByStudent[student.id] ?? []).slice(0, 5);
    const ok = await sendEmail("guardian_digest", student.guardian_email, {
      studentName: `${student.first_name} ${student.last_name}`,
      studentCode: student.student_code,
      level: student.level,
      avgScore: student.avg_score,
      attendance: student.attendance,
      stars: student.stars,
      upcomingAssignments: upcoming.map((a: any) => ({
        title: a.title,
        subject: a.subject,
        dueDate: new Date(a.due_date).toLocaleDateString("en-NG", { timeZone: "Africa/Lagos", dateStyle: "medium" }),
      })),
      loginUrl: loginUrl(),
    });
    if (ok) sent++;
  }

  return reply(supa, job, { sent, skipped, total: students.length });
}

// Only a cron run is a heartbeat; the admin button pressing this is not a
// scheduled job and shouldn't make a dead cron look alive.
function reply(supa: ReturnType<typeof supabaseAdmin>, job: string | null, payload: Record<string, unknown>) {
  return job ? cronOk(supa, job, payload) : NextResponse.json(payload);
}
