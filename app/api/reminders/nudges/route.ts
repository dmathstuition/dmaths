import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { notifyUser } from "@/lib/notify";
import { nudgeFor, STREAK_TITLE, INACTIVE_TITLE, DAILY_REWARD_TITLE, DAILY_REWARD_HOUR } from "@/lib/nudges";
import { watDay } from "@/lib/dailyReward";
import { cronOk } from "@/lib/cronRun";

// Engagement nudges. Call on a DAILY (or more frequent) schedule with
// `Authorization: Bearer ${CRON_SECRET}` or `?key=${CRON_SECRET}`. Three kinds:
//   • streak     — a "keep your streak" push to learners about to lose one
//   • inactive   — a "we've missed you" push to learners idle 7 / 14 days
//   • dailyReward — an evening nudge to open today's reward chest (opted-in
//                   push users only, so we never spam the bell for everyone)
//
// Every send is recorded in `notifications`, so that table is the source of
// truth for "already nudged today" — running this hourly, or twice by accident,
// is harmless. Each block degrades independently if its migration isn't run.
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  const header = req.headers.get("authorization")?.trim();
  const keyParam = new URL(req.url).searchParams.get("key")?.trim();
  const authorized = !!secret && (header === `Bearer ${secret}` || keyParam === secret);
  if (!authorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = supabaseAdmin();
  const today = new Date();
  const startOfToday = `${today.toISOString().slice(0, 10)}T00:00:00.000Z`;

  // ── Streak / inactivity nudges ─────────────────────────────────
  let streak = 0, inactive = 0, skipped = 0;
  {
    const { data: students, error } = await admin
      .from("profiles")
      .select("id, streak_count, streak_last_date")
      .eq("role", "student")
      .eq("is_active", true);

    // No streak columns yet (migration not run) → skip this block only.
    if (!error) {
      const candidates = (students ?? [])
        .map((s: any) => ({ id: s.id, nudge: nudgeFor(s.streak_count ?? 0, s.streak_last_date ?? null, today) }))
        .filter((c): c is { id: string; nudge: NonNullable<ReturnType<typeof nudgeFor>> } => !!c.nudge);

      if (candidates.length) {
        const { data: alreadySent } = await admin
          .from("notifications")
          .select("user_id")
          .in("user_id", candidates.map((c) => c.id))
          .in("title", [STREAK_TITLE, INACTIVE_TITLE])
          .gte("created_at", startOfToday);
        const done = new Set((alreadySent ?? []).map((n: any) => n.user_id));

        const toSend = candidates.filter((c) => !done.has(c.id));
        await Promise.allSettled(toSend.map(async (c) => {
          await notifyUser(admin, c.id, { title: c.nudge.title, body: c.nudge.body, link: "/portal" });
          if (c.nudge.kind === "streak") streak++; else inactive++;
        }));
        skipped = done.size;
      }
    }
  }

  // ── Daily reward chest nudge ───────────────────────────────────
  // Evening only, to opted-in push users who haven't opened today's chest.
  let dailyReward = 0;
  const watHour = Number(today.toLocaleString("en-US", { hour: "numeric", hour12: false, timeZone: "Africa/Lagos" }));
  if (watHour >= DAILY_REWARD_HOUR) {
    // Distinct users who have a push subscription (they chose to be reachable).
    const { data: subs } = await admin.from("push_subscriptions").select("user_id");
    const subIds = Array.from(new Set((subs ?? []).map((s: any) => s.user_id)));
    if (subIds.length) {
      const { data: actives } = await admin
        .from("profiles").select("id").eq("role", "student").eq("is_active", true).in("id", subIds);
      const pushStudents = (actives ?? []).map((a: any) => a.id);

      if (pushStudents.length) {
        // Who has already claimed today? (daily_rewards missing → skip this block.)
        const { data: claimed, error: drErr } = await admin
          .from("daily_rewards").select("student_id").eq("day", watDay()).in("student_id", pushStudents);
        if (!drErr) {
          const claimedSet = new Set((claimed ?? []).map((r: any) => r.student_id));
          const unclaimed = pushStudents.filter((id) => !claimedSet.has(id));

          if (unclaimed.length) {
            const { data: sent } = await admin
              .from("notifications").select("user_id")
              .in("user_id", unclaimed).eq("title", DAILY_REWARD_TITLE).gte("created_at", startOfToday);
            const sentSet = new Set((sent ?? []).map((n: any) => n.user_id));
            const toReward = unclaimed.filter((id) => !sentSet.has(id));

            await Promise.allSettled(toReward.map((id) => notifyUser(admin, id, {
              title: DAILY_REWARD_TITLE,
              body: "Open today's chest for +5 reward points before midnight.",
              link: "/portal",
            })));
            dailyReward = toReward.length;
          }
        }
      }
    }
  }

  return cronOk(admin, "nudges", { sent: streak + inactive + dailyReward, streak, inactive, dailyReward, skipped });
}
