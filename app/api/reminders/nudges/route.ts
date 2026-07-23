import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { notifyUser } from "@/lib/notify";
import { nudgeFor } from "@/lib/nudges";

// Engagement nudges. Call on a schedule (a daily cron-job.org job) with
// `Authorization: Bearer ${CRON_SECRET}` or `?key=${CRON_SECRET}` — same pattern
// as the other reminders. Sends a "keep your streak" push to learners whose
// streak is about to break, and a "we've missed you" push to learners idle for
// 7 or 14 days. Best-effort push + in-app bell via notifyUser.
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
  let streak = 0, inactive = 0;

  await Promise.allSettled((students ?? []).map(async (s: any) => {
    const nudge = nudgeFor(s.streak_count ?? 0, s.streak_last_date ?? null, today);
    if (!nudge) return;
    await notifyUser(admin, s.id, { title: nudge.title, body: nudge.body, link: "/portal" });
    if (nudge.kind === "streak") streak++; else inactive++;
  }));

  return NextResponse.json({ sent: streak + inactive, streak, inactive });
}
