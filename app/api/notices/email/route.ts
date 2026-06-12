import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email";

// Gmail consumer quota is ~100/day. Cap a single blast well under that so one
// announcement can't exhaust the whole day's allowance in one click.
const MAX_PER_BLAST = 80;

export async function POST(req: Request) {
  const supa = supabaseServer();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: me } = await supa.from("profiles").select("role").eq("id", user.id).single();
  if (me?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { noticeId } = await req.json();
  if (!noticeId) return NextResponse.json({ error: "noticeId required" }, { status: 400 });

  const admin = supabaseAdmin();
  const { data: notice } = await admin.from("notices").select("*").eq("id", noticeId).single();
  if (!notice) return NextResponse.json({ error: "Notice not found" }, { status: 404 });
  if (notice.emailed_at) {
    return NextResponse.json({ error: "This announcement was already emailed" }, { status: 400 });
  }

  // Resolve recipients: all active students, or those taking the target subject
  let q = admin.from("profiles").select("email,first_name,subjects").eq("role", "student").eq("is_active", true);
  const { data: students } = await q;
  let recipients = (students ?? []).filter(s => s.email);
  if (notice.target && notice.target !== "all") {
    recipients = recipients.filter(s => (s.subjects ?? []).includes(notice.target));
  }

  if (recipients.length === 0) {
    return NextResponse.json({ error: "No matching students with email" }, { status: 400 });
  }
  if (recipients.length > MAX_PER_BLAST) {
    return NextResponse.json({
      error: `${recipients.length} recipients exceeds the ${MAX_PER_BLAST} safe limit for one send (Gmail daily quota). Narrow the target, or send in smaller groups.`,
    }, { status: 400 });
  }

  // Send sequentially; tally successes and failures
  let ok = 0, failed = 0;
  for (const r of recipients) {
    const sent = await sendEmail("notice", r.email, {
      firstName: r.first_name, title: notice.title, body: notice.body,
      loginUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/login`,
    });
    sent ? ok++ : failed++;
  }

  await admin.from("notices").update({
    emailed_at: new Date().toISOString(),
    emailed_count: ok,
    email_failed_count: failed,
  }).eq("id", noticeId);

  await admin.from("audit_log").insert({
    actor_id: user.id, action: "notice_emailed",
    detail: { noticeId, ok, failed, total: recipients.length },
  });

  return NextResponse.json({ ok: true, sent: ok, failed, total: recipients.length });
}
