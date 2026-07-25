import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { rateLimit } from "@/lib/ratelimit";

// A learner records a completed focus session. The student id is taken from the
// session — never the request body — so nobody can log time for someone else.
export async function POST(req: Request) {
  const supa = supabaseServer();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // A focus session is minutes long; this only stops scripted spam.
  if (!rateLimit(`study:${user.id}`, 30, 60_000)) {
    return NextResponse.json({ error: "Too many sessions logged — slow down." }, { status: 429 });
  }

  const payload = await req.json().catch(() => null);
  const minutes = Math.round(Number(payload?.minutes ?? 0));
  const subject = String(payload?.subject ?? "").trim().slice(0, 60);
  if (!Number.isFinite(minutes) || minutes < 1 || minutes > 240) {
    return NextResponse.json({ error: "A session must be between 1 and 240 minutes." }, { status: 400 });
  }

  const { error } = await supabaseAdmin()
    .from("study_sessions")
    .insert({ student_id: user.id, minutes, subject });
  if (error) {
    const msg = /relation .*study_sessions.* does not exist/i.test(error.message)
      ? "Focus mode needs migration-study-sessions.sql — run it in Supabase."
      : error.message;
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  return NextResponse.json({ ok: true, minutes });
}
