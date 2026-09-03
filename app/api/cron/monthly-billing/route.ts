import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { notifyUser } from "@/lib/notify";
import { sendEmail } from "@/lib/email";
import { loginUrl } from "@/lib/siteUrl";
import { cronOk } from "@/lib/cronRun";
import { computeMonthlyBill, monthKey, monthEndDate, isNearMonthEnd, type AttendedSession } from "@/lib/attendanceBilling";
import { fmtNaira } from "@/lib/payments";

// Attendance-based monthly billing. Call daily from cron-job.org with
// ?key=<CRON_SECRET> (or Authorization: Bearer), same auth as the other jobs.
//
// Three days before the month ends it totals each learner's attended hours for
// the month, multiplies by each class's hourly rate, writes the amount onto the
// learner's profile as this month's fee (due on the last day of the month), and
// notifies the learner and their linked parents — in-app + push AND email.
// sub_billed_month stops a month being billed twice; ?force=1 re-runs it now.
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  const url = new URL(req.url);
  const header = req.headers.get("authorization")?.trim();
  const keyParam = url.searchParams.get("key")?.trim();
  const authorized = !!secret && (header === `Bearer ${secret}` || keyParam === secret);
  if (!authorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = supabaseAdmin();
  const now = new Date();
  const force = url.searchParams.get("force") === "1";

  // Only act in the last 3 days of the month (unless forced for a manual run).
  if (!force && !isNearMonthEnd(now, 3)) {
    return cronOk(admin, "monthly-billing", { ok: true, skipped: "outside billing window", billed: 0 });
  }

  const key = monthKey(now);
  const dueDate = monthEndDate(now);
  const monthFirst = `${key}-01`;

  // Attended sessions this month.
  const { data: att, error } = await admin
    .from("attendance_records")
    .select("student_id, class_id, present, session_date")
    .eq("present", true)
    .gte("session_date", monthFirst)
    .lte("session_date", dueDate);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const records = att ?? [];
  if (!records.length) return cronOk(admin, "monthly-billing", { ok: true, billed: 0, note: "no attendance this month" });

  // The classes those sessions belong to → duration + rate tier. rate_tier may
  // not be migrated yet; fall back to duration only (tier defaults to standard).
  const classIds = [...new Set(records.map((r: any) => r.class_id).filter(Boolean))];
  const classMap = new Map<string, { duration: number; tier: string }>();
  if (classIds.length) {
    let { data: classes, error: cErr } = await admin.from("classes").select("id, duration_minutes, rate_tier").in("id", classIds);
    if (cErr && /column .*rate_tier/i.test(cErr.message)) {
      ({ data: classes } = await admin.from("classes").select("id, duration_minutes").in("id", classIds) as any);
    }
    for (const c of classes ?? []) {
      classMap.set(c.id, { duration: Number(c.duration_minutes) || 60, tier: String((c as any).rate_tier ?? "standard") || "standard" });
    }
  }

  // Group attended sessions per learner.
  const perStudent = new Map<string, AttendedSession[]>();
  for (const r of records) {
    const c = classMap.get((r as any).class_id) ?? { duration: 60, tier: "standard" };
    const list = perStudent.get((r as any).student_id) ?? [];
    list.push({ present: true, session_date: (r as any).session_date, durationMinutes: c.duration, rateTier: c.tier });
    perStudent.set((r as any).student_id, list);
  }

  // Profiles for the learners we might bill — email, name, and last billed month.
  const studentIds = [...perStudent.keys()];
  const { data: profiles } = await admin
    .from("profiles")
    .select("id, first_name, email, is_active, sub_billed_month")
    .in("id", studentIds)
    .eq("role", "student");
  const profMap = new Map((profiles ?? []).map((p: any) => [p.id, p]));

  let billed = 0;
  for (const sid of studentIds) {
    const prof = profMap.get(sid);
    if (!prof || prof.is_active === false) continue;
    if (!force && prof.sub_billed_month === key) continue; // already billed this month

    const bill = computeMonthlyBill(perStudent.get(sid) ?? [], now);
    if (bill.amount <= 0) continue;

    // Write this month's fee onto the profile and reuse the subscription plumbing
    // (portal banner, receipts, pay-from-portal). sub_reminded_at is stamped so
    // the separate subscription-reminder cron doesn't double-notify today.
    await admin.from("profiles").update({
      sub_active: true,
      sub_amount: bill.amount,
      sub_due_date: dueDate,
      sub_billed_month: key,
      sub_reminded_at: new Date().toISOString(),
    }).eq("id", sid);

    const hoursLabel = `${bill.hours} hour${bill.hours === 1 ? "" : "s"}`;
    const note = {
      title: "🧾 This month's tuition invoice",
      body: `You attended ${hoursLabel} this month — ${fmtNaira(bill.amount)} due by month-end.`,
      link: "/portal/payments",
    };
    await notifyUser(admin, sid, note);
    if (prof.email) {
      await sendEmail("notice", prof.email, {
        firstName: prof.first_name || "there",
        title: note.title,
        body: `${note.body} You can view the invoice and pay securely from the Payments page in your portal.`,
        loginUrl: loginUrl(),
      });
    }

    // Notify linked parents — this is the "sent to the parent" step.
    const { data: links } = await admin.from("parent_student_links").select("parent_id").eq("student_id", sid);
    const childBody = `${prof.first_name || "Your child"} attended ${hoursLabel} this month — ${fmtNaira(bill.amount)} is due by month-end.`;
    for (const l of links ?? []) {
      await notifyUser(admin, l.parent_id, { title: note.title, body: childBody, link: "/parent" });
      const { data: parent } = await admin.from("profiles").select("first_name, email").eq("id", l.parent_id).maybeSingle();
      if (parent?.email) {
        await sendEmail("notice", parent.email, {
          firstName: parent.first_name || "there",
          title: note.title,
          body: `${childBody} You can view the invoice and pay securely from the Payments page in the parent portal.`,
          loginUrl: loginUrl(),
        });
      }
    }
    billed++;
  }

  return cronOk(admin, "monthly-billing", { ok: true, month: key, dueDate, billed, considered: studentIds.length });
}
