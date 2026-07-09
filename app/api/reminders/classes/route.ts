import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { notifyUser } from "@/lib/notify";

// Class reminders. Called on a schedule (e.g. a free cron-job.org job every
// ~15 min) with `Authorization: Bearer ${CRON_SECRET}` — same pattern as the
// keepalive cron. Finds classes starting within the next 30 minutes that
// haven't been reminded yet, notifies every enrolled student, then stamps
// `reminded_at` so a later run can't send the same reminder twice.
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  // Auth accepts EITHER the bearer header OR a ?key= query param, so a cron
  // service can authenticate without custom headers (the common failure point).
  // Both sides are trimmed so a stray newline/space pasted into the Vercel value
  // can't cause a silent mismatch. The URL is HTTPS-encrypted in transit; the
  // key does appear in server/cron logs, which is acceptable for this low-stakes
  // reminder trigger.
  const secret = process.env.CRON_SECRET?.trim();
  const header = req.headers.get("authorization")?.trim();
  const keyParam = new URL(req.url).searchParams.get("key")?.trim();
  const authorized = !!secret && (header === `Bearer ${secret}` || keyParam === secret);
  if (!authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = supabaseAdmin();
  const now = new Date();
  const soon = new Date(now.getTime() + 30 * 60 * 1000); // +30 min

  const { data: classes } = await admin
    .from("classes")
    .select("id, subject, starts_at, link, tutor_id")
    .is("reminded_at", null)
    .gte("starts_at", now.toISOString())
    .lte("starts_at", soon.toISOString());

  if (!classes?.length) {
    return NextResponse.json({ reminded: 0, classes: 0 });
  }

  let reminded = 0;
  for (const cls of classes) {
    const { data: roster } = await admin
      .from("class_students")
      .select("student_id")
      .eq("class_id", cls.id);

    const time = new Date(cls.starts_at).toLocaleTimeString("en-NG", {
      timeZone: "Africa/Lagos",
      hour: "2-digit",
      minute: "2-digit",
    });

    for (const r of roster ?? []) {
      await notifyUser(admin, r.student_id, {
        title: "Class starting soon 📚",
        body: `${cls.subject} at ${time}`,
        link: "/portal/classes",
      });
      reminded++;
    }

    // Remind the assigned tutor too, pointing at their own portal.
    if (cls.tutor_id) {
      await notifyUser(admin, cls.tutor_id, {
        title: "Your class starts soon 📚",
        body: `${cls.subject} at ${time}`,
        link: "/tutor/classes",
      });
      reminded++;
    }

    // Stamp so we never remind for this class again.
    await admin.from("classes").update({ reminded_at: new Date().toISOString() }).eq("id", cls.id);
  }

  return NextResponse.json({ reminded, classes: classes.length });
}
