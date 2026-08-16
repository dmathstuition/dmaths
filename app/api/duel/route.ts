import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { pickRandom } from "@/lib/questionBank";
import { gradeAnswers, type Response } from "@/lib/practice";
import { boostMultiplier } from "@/lib/powerups";
import { happyHourMultiplier } from "@/lib/happyHour";
import { notifyUser } from "@/lib/notify";
import { duelCount, duelOutcome, makeDuelCode, DUEL_REWARD } from "@/lib/duel";

// Quiz Duel — async head-to-head. Questions and the answer key stay server-side,
// so scores can't be forged; the winner is credited once, when the second player
// finishes.
export const dynamic = "force-dynamic";

const explain = (m: string) =>
  /relation .*duels/i.test(m) ? "Quiz Duel needs migration-duels.sql — run it in Supabase." : m;

async function learner() {
  const supa = supabaseServer();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  const { data: me } = await supa.from("profiles").select("role").eq("id", user.id).single();
  if (me?.role !== "student") return { error: NextResponse.json({ error: "Learners only" }, { status: 403 }) };
  return { user };
}

// Fetch the duel's questions (fixed order), answers stripped.
async function duelQuestions(admin: ReturnType<typeof supabaseAdmin>, ids: string[]) {
  if (!ids.length) return [];
  const sel = async (cols: string) => admin.from("question_bank").select(cols).in("id", ids);
  let { data, error }: { data: any; error: any } = await sel("id, question, code, image_url, options");
  if (error && /column .*image_url/i.test(error.message)) ({ data, error } = await sel("id, question, code, options"));
  const byId = new Map((data ?? []).map((r: any) => [r.id, r]));
  // Preserve the stored order so both players see the same sequence.
  return ids.map((id) => byId.get(id)).filter(Boolean).map((r: any) => ({
    id: r.id, question: r.question, code: r.code ?? "", image_url: r.image_url ?? "", options: r.options ?? [],
  }));
}

export async function GET(req: Request) {
  const gate = await learner();
  if ("error" in gate) return gate.error;
  const admin = supabaseAdmin();
  const code = new URL(req.url).searchParams.get("code")?.trim().toUpperCase();

  try {
    if (code) {
      const { data: d } = await admin.from("duels").select("*").eq("code", code).maybeSingle();
      if (!d || (d.creator_id !== gate.user.id && d.opponent_id !== gate.user.id)) {
        return NextResponse.json({ error: "Duel not found." }, { status: 404 });
      }
      return NextResponse.json({ duel: await shape(admin, d, gate.user.id) });
    }
    const { data: mine } = await admin.from("duels")
      .select("code, subject, status, creator_id, opponent_id, creator_score, opponent_score, winner_id, created_at")
      .or(`creator_id.eq.${gate.user.id},opponent_id.eq.${gate.user.id}`)
      .order("created_at", { ascending: false }).limit(10);
    const duels = await Promise.all((mine ?? []).map((d: any) => shape(admin, d, gate.user.id)));
    return NextResponse.json({ duels });
  } catch (e: any) {
    return NextResponse.json({ error: explain(e?.message ?? "load failed"), duels: [] }, { status: 200 });
  }
}

// A viewer-relative view of a duel (never leaks the other side before you've played).
async function shape(admin: ReturnType<typeof supabaseAdmin>, d: any, meId: string) {
  const iAmCreator = d.creator_id === meId;
  const myScore = iAmCreator ? d.creator_score : d.opponent_score;
  const theirScore = iAmCreator ? d.opponent_score : d.creator_score;
  let opponentName = "";
  const otherId = iAmCreator ? d.opponent_id : d.creator_id;
  if (otherId) {
    const { data: p } = await admin.from("profiles").select("first_name, last_name").eq("id", otherId).maybeSingle();
    opponentName = `${p?.first_name ?? ""} ${p?.last_name?.[0] ? p.last_name[0] + "." : ""}`.trim();
  }
  return {
    code: d.code, subject: d.subject, status: d.status,
    iAmCreator, myScore: myScore ?? null,
    theirScore: d.status === "resolved" ? (theirScore ?? null) : null,
    opponentName, reward: d.reward,
    result: d.status === "resolved" ? (d.winner_id == null ? "draw" : d.winner_id === meId ? "won" : "lost") : null,
    played: myScore != null,
  };
}

export async function POST(req: Request) {
  const gate = await learner();
  if ("error" in gate) return gate.error;
  const admin = supabaseAdmin();
  const body = await req.json().catch(() => null);
  const action = String(body?.action ?? "");

  // ── Create a duel and hand the creator their questions ──
  if (action === "create") {
    const subject = String(body?.subject ?? "").trim().slice(0, 80);
    const count = duelCount(body?.count);
    const sel = async (cols: string) => {
      let q = admin.from("question_bank").select(cols).limit(400);
      if (subject) q = q.eq("subject", subject);
      return q;
    };
    let { data, error }: { data: any; error: any } = await sel("id, options");
    if (error) return NextResponse.json({ error: explain(error.message) }, { status: 500 });
    const picked = pickRandom((data ?? []).filter((r: any) => (r.options ?? []).length >= 2), count);
    if (picked.length < Math.min(count, 3)) return NextResponse.json({ error: "Not enough questions for a duel yet — try another subject." }, { status: 400 });
    const ids = picked.map((r: any) => r.id);

    // Insert with a fresh code, retrying on the rare collision.
    let created: any = null, insErr: any = null;
    for (let i = 0; i < 5 && !created; i++) {
      const code = makeDuelCode();
      const res = await admin.from("duels").insert({ code, subject, question_ids: ids, creator_id: gate.user.id }).select().single();
      created = res.data; insErr = res.error;
      if (insErr && !/duplicate|unique/i.test(insErr.message)) break;
    }
    if (!created) return NextResponse.json({ error: explain(insErr?.message ?? "Couldn't create the duel.") }, { status: 500 });
    return NextResponse.json({ code: created.code, questions: await duelQuestions(admin, ids) });
  }

  // ── Join an open duel by code ──
  if (action === "join") {
    const code = String(body?.code ?? "").trim().toUpperCase().slice(0, 12);
    const { data: d } = await admin.from("duels").select("*").eq("code", code).maybeSingle();
    if (!d) return NextResponse.json({ error: "No duel with that code." }, { status: 404 });
    if (d.creator_id === gate.user.id) return NextResponse.json({ error: "That's your own duel — share the code with a friend." }, { status: 400 });
    if (d.opponent_id && d.opponent_id !== gate.user.id) return NextResponse.json({ error: "This duel already has an opponent." }, { status: 409 });
    if (d.status === "open" || !d.opponent_id) {
      await admin.from("duels").update({ opponent_id: gate.user.id, status: "full" }).eq("id", d.id);
    }
    return NextResponse.json({ code: d.code, questions: await duelQuestions(admin, (d.question_ids ?? []) as string[]) });
  }

  // ── Submit your answers for a duel ──
  if (action === "submit") {
    const code = String(body?.code ?? "").trim().toUpperCase().slice(0, 12);
    const responses: Response[] = Array.isArray(body?.responses)
      ? body.responses.map((r: any) => ({ id: String(r?.id ?? ""), chosen: Number(r?.chosen) })).filter((r: Response) => r.id)
      : [];
    const { data: d } = await admin.from("duels").select("*").eq("code", code).maybeSingle();
    if (!d) return NextResponse.json({ error: "Duel not found." }, { status: 404 });
    const iAmCreator = d.creator_id === gate.user.id;
    const iAmOpponent = d.opponent_id === gate.user.id;
    if (!iAmCreator && !iAmOpponent) return NextResponse.json({ error: "You're not in this duel." }, { status: 403 });
    if ((iAmCreator && d.creator_score != null) || (iAmOpponent && d.opponent_score != null)) {
      return NextResponse.json({ error: "You've already played this duel." }, { status: 409 });
    }

    // Grade against the real answer key for exactly this duel's questions.
    const ids = (d.question_ids ?? []) as string[];
    const { data: keyRows } = await admin.from("question_bank").select("id, answer").in("id", ids);
    const key = (keyRows ?? []).map((r: any) => ({ id: r.id, answer: Number(r.answer) }));
    const { correct, total } = gradeAnswers(key, responses);

    const patch: any = iAmCreator ? { creator_score: correct } : { opponent_score: correct };
    const creatorScore = iAmCreator ? correct : d.creator_score;
    const opponentScore = iAmOpponent ? correct : d.opponent_score;

    // Both done → resolve and pay the winner (once).
    let resolved = false, result: string | null = null;
    if (creatorScore != null && opponentScore != null) {
      resolved = true;
      const who = duelOutcome(creatorScore, opponentScore);
      const winnerId = who === "creator" ? d.creator_id : who === "opponent" ? d.opponent_id : null;
      let reward = 0;
      if (winnerId) {
        const { data: br } = await admin.from("profiles").select("boost_until").eq("id", winnerId).single();
        reward = DUEL_REWARD * Math.max(boostMultiplier((br as any)?.boost_until), await happyHourMultiplier(admin));
        const { data: wp } = await admin.from("profiles").select("reward_points").eq("id", winnerId).single();
        await admin.from("profiles").update({ reward_points: Number(wp?.reward_points ?? 0) + reward }).eq("id", winnerId);
      }
      Object.assign(patch, { status: "resolved", winner_id: winnerId, reward });
      result = who === "draw" ? "draw" : winnerId === gate.user.id ? "won" : "lost";

      // Tell both players the outcome.
      const loserId = winnerId ? (winnerId === d.creator_id ? d.opponent_id : d.creator_id) : null;
      await Promise.allSettled([
        winnerId && notifyUser(admin, winnerId, { title: "⚔️ You won a duel!", body: `You beat your opponent ${Math.max(creatorScore, opponentScore)}–${Math.min(creatorScore, opponentScore)} and earned ${reward} points.`, link: "/portal/duel" }),
        loserId && notifyUser(admin, loserId, { title: "Duel finished", body: `A close one — you lost ${Math.min(creatorScore, opponentScore)}–${Math.max(creatorScore, opponentScore)}. Rematch?`, link: "/portal/duel" }),
      ].filter(Boolean) as Promise<any>[]);
    }

    const { error: upErr } = await admin.from("duels").update(patch).eq("id", d.id);
    if (upErr) return NextResponse.json({ error: explain(upErr.message) }, { status: 500 });
    return NextResponse.json({ correct, total, resolved, result, waiting: !resolved });
  }

  return NextResponse.json({ error: "Unknown action." }, { status: 400 });
}
