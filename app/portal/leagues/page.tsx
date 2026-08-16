import LeaguesClient from "@/components/portal/LeaguesClient";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getProfile } from "@/lib/auth";
import { leagueWeek, weeklyPoints } from "@/lib/leagues";

export const dynamic = "force-dynamic";
export const metadata = { title: "Leagues · D-Maths" };

function nameOf(w: any) {
  const f = (w.first_name ?? "").trim();
  const li = w.last_name?.trim()?.[0];
  return (f + (li ? ` ${li.toUpperCase()}.` : "")).trim() || "Student";
}

export default async function LeaguesPage() {
  const me = await getProfile();
  // Ranking every learner needs the service role (a learner's RLS only exposes
  // their own row). Only leaderboard-safe fields are selected and sent on.
  const admin = supabaseAdmin();

  const core = "id, first_name, last_name, reward_points";
  const rank = (cols: string) => admin.from("profiles").select(cols)
    .eq("role", "student").eq("is_active", true)
    .order("reward_points", { ascending: false }).limit(1000);
  // Avatar cosmetics may not be migrated — fall back to core so it still ranks.
  const primary = await rank(`${core}, avatar_choice, avatar_title`);
  const learners: any[] = (primary.error ? (await rank(core)).data : primary.data) ?? [];

  // ── Weekly tournament: snapshot baselines at the first view of a new week ──
  const week = leagueWeek();
  let enabled = true;
  let baseline = new Map<string, number>();
  const { data: curBase, error: baseErr } = await admin
    .from("league_baselines").select("student_id, baseline").eq("week", week);

  if (baseErr) {
    enabled = false; // migration-leagues.sql not run yet
  } else {
    baseline = new Map((curBase ?? []).map((b: any) => [b.student_id, b.baseline]));
    if (!curBase?.length && learners.length) {
      const rows = learners.map((l) => ({ student_id: l.id, week, baseline: l.reward_points ?? 0 }));
      await admin.from("league_baselines").upsert(rows, { onConflict: "student_id,week", ignoreDuplicates: true });
      baseline = new Map(rows.map((r) => [r.student_id, r.baseline]));
    }
  }

  // Weekly points per learner, ranked (tie-break on lifetime total).
  const withWeekly = learners.map((l) => ({
    id: l.id,
    name: nameOf(l),
    weekly: weeklyPoints(l.reward_points, baseline.get(l.id) ?? l.reward_points),
    total: l.reward_points ?? 0,
    avatar_choice: l.avatar_choice ?? null,
    avatar_title: l.avatar_title ?? null,
    isMe: l.id === (me?.id ?? ""),
  }));

  const tournament = withWeekly
    .filter((w) => w.weekly > 0)
    .sort((a, b) => b.weekly - a.weekly || b.total - a.total)
    .slice(0, 50);

  const myRow = withWeekly.find((w) => w.isMe) ?? null;
  const myRank = myRow && myRow.weekly > 0
    ? tournament.findIndex((w) => w.id === myRow.id) + 1 || null
    : null;

  return (
    <LeaguesClient
      enabled={enabled}
      week={week}
      tournament={tournament}
      me={{
        name: myRow?.name ?? "You",
        total: Number((me as any)?.reward_points ?? myRow?.total ?? 0),
        weekly: myRow?.weekly ?? 0,
        rank: myRank,
      }}
      playerCount={withWeekly.length}
    />
  );
}
