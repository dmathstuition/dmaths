import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getUser } from "@/lib/auth";
import { canLearnerStart, scoreAptitude, type AptitudeQuestion } from "@/lib/aptitude";

// The learner submits their aptitude test. Scoring happens here against the
// answer key held server-side (the taking UI never receives it).
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Please sign in." }, { status: 401 });

  const b = await req.json().catch(() => null);
  const testId = String(b?.testId ?? "");
  const answers: Record<string, number> = (b?.answers && typeof b.answers === "object") ? b.answers : {};
  if (!testId) return NextResponse.json({ error: "testId required" }, { status: 400 });

  const admin = supabaseAdmin();
  const { data: test } = await admin.from("aptitude_tests")
    .select("id, student_id, status, scheduled_at, questions").eq("id", testId).maybeSingle();
  if (!test) return NextResponse.json({ error: "Test not found." }, { status: 404 });
  if (test.student_id !== user.id) return NextResponse.json({ error: "This isn't your test." }, { status: 403 });
  if (!canLearnerStart(test)) return NextResponse.json({ error: "This test isn't open yet." }, { status: 400 });

  const s = scoreAptitude((test.questions ?? []) as AptitudeQuestion[], answers);
  const { error } = await admin.from("aptitude_tests").update({
    answers, score: s.score, total: s.total, status: "submitted", submitted_at: new Date().toISOString(),
  }).eq("id", testId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, score: s.score, total: s.total, percent: s.percent, band: s.band });
}
