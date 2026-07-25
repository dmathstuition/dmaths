import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { notifyUser } from "@/lib/notify";
import { nudgeFor, STREAK_TITLE, INACTIVE_TITLE } from "@/lib/nudges";

// Engagement nudges: a "keep your streak" push to learners about to lose one,
// and a "we've missed you" push to learners idle 7 or 14 days. Call on a DAILY
// schedule with `Authorization: Bearer ${CRON_SECRET}` or `?key=${CRON_SECRET}`.
//
// The trigger conditions stay true all day, so the endpoint must decide for
// itself whether a learner has already been nudged today — otherwise a cron
// running every minute sends a notification every minute. `notifyUser` records
// every nudge in `notifications`, so that table is the source of truth: one
// query tells us who has already had theirs. Running this hourly, or twice by
// accident, is therefore harmless.
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  const header = req.headers.get("authorization")?.trim();
  const keyParam = new URL(req.url).searchParams.get("key")?.trim();
  const authorized = !!secret && (header === `Bearer ${secret}` || keyParam === secret);
  if (!authorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = supabaseAdmin();
  const { data: students, error } = await admin
    .from("profiles")
    .select("id, streak_count, streak_last_date")
    .eq("role", "student")
    .eq("is_active", true);

  // Table without the streak columns yet (migration not run) → nothing to do.
  if (error) return NextResponse.json({ sent: 0, note: "streak columns not available" });

  const today = new Date();

  // Who would qualify today?
  const candidates = (students ?? [])
    .map((s: any) => ({ id: s.id, nudge: nudgeFor(s.streak_count ?? 0, s.streak_last_date ?? null, today) }))
    .filter((c): c is { id: string; nudge: NonNullable<ReturnType<typeof nudgeFor>> } => !!c.nudge);

  if (!candidates.length) return NextResponse.json({ sent: 0, streak: 0, inactive: 0, skipped: 0 });

  // Who already got one today? (One query, so this stays cheap at any frequency.)
  const startOfToday = `${today.toISOString().slice(0, 10)}T00:00:00.000Z`;
  const { data: alreadySent } = await admin
    .from("notifications")
    .select("user_id")
    .in("user_id", candidates.map((c) => c.id))
    .in("title", [STREAK_TITLE, INACTIVE_TITLE])
    .gte("created_at", startOfToday);
  const done = new Set((alreadySent ?? []).map((n: any) => n.user_id));

  const toSend = candidates.filter((c) => !done.has(c.id));
  let streak = 0, inactive = 0;

  await Promise.allSettled(toSend.map(async (c) => {
    await notifyUser(admin, c.id, { title: c.nudge.title, body: c.nudge.body, link: "/portal" });
    if (c.nudge.kind === "streak") streak++; else inactive++;
  }));

  return NextResponse.json({ sent: streak + inactive, streak, inactive, skipped: done.size });
}
