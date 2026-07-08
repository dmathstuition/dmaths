import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { notifyUser } from "@/lib/notify";

// Monthly-subscription payment reminders. Call daily from cron-job.org with
// ?key=<CRON_SECRET> (or Authorization: Bearer) — same auth as the class
// reminders. Nudges subscribers (and their linked parents) from 3 days before
// the due date, then re-nudges weekly while overdue. sub_reminded_at keeps a
// daily cron from spamming.
export const dynamic = "force-dynamic";

const DAY = 86_400_000;

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  const header = req.headers.get("authorization")?.trim();
  const keyParam = new URL(req.url).searchParams.get("key")?.trim();
  const authorized = !!secret && (header === `Bearer ${secret}` || keyParam === secret);
  if (!authorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = supabaseAdmin();
  const soon = new Date(Date.now() + 3 * DAY).toISOString().slice(0, 10);

  // Subscribers due within 3 days (or already overdue).
  const { data: subs, error } = await admin
    .from("profiles")
    .select("id, first_name, sub_amount, sub_due_date, sub_reminded_at")
    .eq("role", "student")
    .eq("sub_active", true)
    .lte("sub_due_date", soon);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let reminded = 0;
  for (const s of subs ?? []) {
    // At most one nudge per 6 days per learner.
    if (s.sub_reminded_at && Date.now() - new Date(s.sub_reminded_at).getTime() < 6 * DAY) continue;

    const due = new Date(`${s.sub_due_date}T00:00:00+01:00`);
    const overdue = Date.now() > due.getTime() + DAY;
    const dueLabel = due.toLocaleDateString("en-NG", { timeZone: "Africa/Lagos", day: "numeric", month: "long" });
    const amount = Number(s.sub_amount) > 0 ? `₦${Number(s.sub_amount).toLocaleString("en-NG")} ` : "";

    const note = overdue
      ? { title: "⚠️ Tuition payment overdue", body: `${amount}monthly tuition was due on ${dueLabel}. Please pay to keep learning without interruption.`, link: "/portal" }
      : { title: "💛 Tuition due soon", body: `${amount}monthly tuition is due on ${dueLabel}.`, link: "/portal" };

    await notifyUser(admin, s.id, note);

    // Nudge linked parents too.
    const { data: links } = await admin
      .from("parent_student_links").select("parent_id").eq("student_id", s.id);
    for (const l of links ?? []) {
      await notifyUser(admin, l.parent_id, {
        ...note,
        body: `${s.first_name}'s ${note.body[0].toLowerCase()}${note.body.slice(1)}`,
        link: "/parent",
      });
    }

    await admin.from("profiles").update({ sub_reminded_at: new Date().toISOString() }).eq("id", s.id);
    reminded++;
  }

  return NextResponse.json({ ok: true, due: subs?.length ?? 0, reminded });
}
