import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireStaff } from "@/lib/authRole";
import { pickRandom } from "@/lib/questionBank";
import { gradeAnswers, type Response } from "@/lib/practice";
import { boostMultiplier } from "@/lib/powerups";
import { happyHourMultiplier } from "@/lib/happyHour";
import { notifyUser } from "@/lib/notify";
import {
  bossWeek, bossScorePercent, bossPassed,
  BOSS_DEFAULT_PASS, BOSS_DEFAULT_REWARD, BOSS_MAX_QUESTIONS,
} from "@/lib/boss";

// Weekly Boss Battle. The admin nominates a question group as the week's Boss;
// each learner gets one attempt (guarded by a unique row), and a pass credits a
// one-off reward. Questions and the answer key stay server-side, exactly like
// mocks and practice, so nothing can be gamed from the browser.
export const dynamic = "force-dynamic";

const explain = (m: string) =>
  /relation .*boss_/i.test(m) ? "Boss Battle needs migration-boss-battle.sql — run it in Supabase." : m;

async function me() {
  const supa = supabaseServer();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return { user: null, role: "" };
  const { data } = await supa.from("profiles").select("role, reward_points").eq("id", user.id).single();
  return { user, role: data?.role ?? "", points: Number(data?.reward_points ?? 0) };
}

// Shape the current Boss for the client: its group, question count and rules,
// plus this learner's attempt (if any). Returns { boss: null } when none is set.
async function currentBoss(admin: ReturnType<typeof supabaseAdmin>, week: string, studentId?: string) {
  const { data: boss, error } = await admin.from("boss_battles")
    .select("week, group_name, pass_pct, reward").eq("week", week).maybeSingle();
  if (error) throw error;
  if (!boss) return { week, boss: null as null };

  const { count } = await admin.from("question_bank")
    .select("id", { count: "exact", head: true }).eq("group_name", boss.group_name);

  let attempt = null;
  if (studentId) {
    const { data: a } = await admin.from("boss_attempts")
      .select("score, total, passed, points, created_at").eq("student_id", studentId).eq("week", week).maybeSingle();
    attempt = a ?? null;
  }
  return {
    week,
    boss: { name: boss.group_name, questionCount: count ?? 0, passPct: boss.pass_pct, reward: boss.reward },
    attempt,
  };
}

export async function GET() {
  const { user, role } = await me();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const admin = supabaseAdmin();
  try {
    return NextResponse.json(await currentBoss(admin, bossWeek(), role === "student" ? user.id : undefined));
  } catch (e: any) {
    return NextResponse.json({ error: explain(e?.message ?? "Failed"), boss: null }, { status: 200 });
  }
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const action = String(body?.action ?? "");
  const admin = supabaseAdmin();
  const week = bossWeek();

  // ── Admin: nominate this week's Boss ──
  if (action === "set") {
    const staff = await requireStaff();
    if (!staff || staff.role !== "admin") return NextResponse.json({ error: "Admins only" }, { status: 403 });
    const group_name = String(body?.group_name ?? "").trim().slice(0, 80);
    if (!group_name) return NextResponse.json({ error: "Pick a group to make the Boss." }, { status: 400 });
    const pass_pct = Math.max(10, Math.min(100, Math.round(Number(body?.passPct) || BOSS_DEFAULT_PASS)));
    const reward = Math.max(0, Math.min(1000, Math.round(Number(body?.reward) || BOSS_DEFAULT_REWARD)));

    const { count } = await admin.from("question_bank")
      .select("id", { count: "exact", head: true }).eq("group_name", group_name);
    if (!count) return NextResponse.json({ error: "That group has no questions yet." }, { status: 400 });

    const { error } = await admin.from("boss_battles")
      .upsert({ week, group_name, pass_pct, reward, created_by: staff.id }, { onConflict: "week" });
    if (error) return NextResponse.json({ error: explain(error.message) }, { status: 500 });
    await admin.from("audit_log").insert({ actor_id: staff.id, action: "boss_set", detail: { week, group_name, pass_pct, reward } });
    return NextResponse.json({ ok: true, questionCount: count });
  }

  // ── Learner: start / submit ──
  const { user, role, points } = await me();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (role !== "student") return NextResponse.json({ error: "Learners only" }, { status: 403 });

  const { data: boss, error: bErr } = await admin.from("boss_battles")
    .select("group_name, pass_pct, reward").eq("week", week).maybeSingle();
  if (bErr) return NextResponse.json({ error: explain(bErr.message) }, { status: 500 });
  if (!boss) return NextResponse.json({ error: "There's no Boss this week — check back soon." }, { status: 404 });

  if (action === "start") {
    // Already faced this week? Hand back the result rather than a fresh paper.
    const { data: prior } = await admin.from("boss_attempts")
      .select("score, total, passed, points").eq("student_id", user.id).eq("week", week).maybeSingle();
    if (prior) return NextResponse.json({ done: true, attempt: prior });

    const { data, error } = await admin.from("question_bank")
      .select("id, question, code, options").eq("group_name", boss.group_name).limit(400);
    if (error) return NextResponse.json({ error: explain(error.message) }, { status: 500 });
    const picked = pickRandom(data ?? [], BOSS_MAX_QUESTIONS);
    if (!picked.length) return NextResponse.json({ error: "The Boss's questions have gone — tell your tutor." }, { status: 404 });
    const questions = picked.map((r: any) => ({ id: r.id, question: r.question, code: r.code ?? "", options: r.options ?? [] }));
    return NextResponse.json({ name: boss.group_name, passPct: boss.pass_pct, reward: boss.reward, questions });
  }

  if (action === "submit") {
    const responses: Response[] = Array.isArray(body?.responses)
      ? body.responses.map((r: any) => ({ id: String(r?.id ?? ""), chosen: Number(r?.chosen) })).filter((r: Response) => r.id)
      : [];
    if (!responses.length) return NextResponse.json({ error: "No answers submitted." }, { status: 400 });

    // Only questions that really belong to this Boss's group count.
    const ids = responses.map((r) => r.id);
    const { data: keyRows, error: keyErr } = await admin.from("question_bank")
      .select("id, answer").in("id", ids).eq("group_name", boss.group_name);
    if (keyErr) return NextResponse.json({ error: explain(keyErr.message) }, { status: 500 });
    const key = (keyRows ?? []).map((r: any) => ({ id: r.id, answer: Number(r.answer) }));
    if (!key.length) return NextResponse.json({ error: "Those questions aren't part of this Boss." }, { status: 400 });

    const { correct, total, results } = gradeAnswers(key, responses);
    const percent = bossScorePercent(correct, total);
    const passed = bossPassed(correct, total, boss.pass_pct);

    // Reward only a first-time defeat, doubled under a boost / Happy Hour.
    let award = 0;
    if (passed) {
      const { data: boostRow } = await admin.from("profiles").select("boost_until").eq("id", user.id).single();
      const mult = Math.max(boostMultiplier((boostRow as any)?.boost_until), await happyHourMultiplier(admin));
      award = boss.reward * mult;
    }

    // The unique (student_id, week) row is the one-attempt guard: if it already
    // exists this insert fails and no second reward is ever paid.
    const { error: insErr } = await admin.from("boss_attempts")
      .insert({ student_id: user.id, week, score: correct, total, passed, points: award });
    if (insErr) {
      if (/duplicate|unique/i.test(insErr.message)) {
        return NextResponse.json({ error: "You've already faced this week's Boss." }, { status: 409 });
      }
      return NextResponse.json({ error: explain(insErr.message) }, { status: 500 });
    }

    let newTotal = points;
    if (award > 0) {
      newTotal += award;
      await admin.from("profiles").update({ reward_points: newTotal }).eq("id", user.id);
      await notifyUser(admin, user.id, {
        title: "⚔️ Boss defeated!",
        body: `You beat “${boss.group_name}” with ${percent}% and earned ${award} reward points.`,
        link: "/portal/boss",
      });
    }
    return NextResponse.json({ correct, total, percent, passed, points: award, newTotal, results, passPct: boss.pass_pct });
  }

  return NextResponse.json({ error: "Unknown action." }, { status: 400 });
}
