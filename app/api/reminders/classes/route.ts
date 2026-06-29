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
  const auth = req.headers.get("authorization");
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = supabaseAdmin();
  const now = new Date();
  const soon = new Date(now.getTime() + 30 * 60 * 1000); // +30 min

  const { data: classes } = await admin
    .from("classes")
    .select("id, subject, starts_at, link")
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

    // Stamp so we never remind for this class again.
    await admin.from("classes").update({ reminded_at: new Date().toISOString() }).eq("id", cls.id);
  }

  return NextResponse.json({ reminded, classes: classes.length });
}
