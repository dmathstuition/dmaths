import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { rateLimit, clientKey } from "@/lib/ratelimit";

export async function POST(req: Request) {
  // 10 CBT submissions per minute per IP — generous for humans, stops scripts
  if (!rateLimit(clientKey(req, "cbt"), 10, 60_000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const supa = supabaseServer();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { submissionId, answers } = await req.json();
  if (!submissionId || !Array.isArray(answers)) {
    return NextResponse.json({ error: "Missing submissionId or answers" }, { status: 400 });
  }

  const admin = supabaseAdmin();

  const { data: sub } = await admin
    .from("assignment_submissions")
    .select("*, assignment:assignments(cbt_questions, cbt_close)")
    .eq("id", submissionId)
    .eq("student_id", user.id)
    .single();

  if (!sub) return NextResponse.json({ error: "Submission not found" }, { status: 404 });
  if (sub.status !== "pending") {
    return NextResponse.json({ error: "Already submitted" }, { status: 400 });
  }
  if (sub.assignment.cbt_close && new Date() > new Date(sub.assignment.cbt_close)) {
    return NextResponse.json({ error: "CBT window has closed" }, { status: 400 });
  }

  const questions = sub.assignment.cbt_questions as any[];
  if (!questions?.length) {
    return NextResponse.json({ error: "No questions found" }, { status: 400 });
  }
  if (answers.length !== questions.length) {
    return NextResponse.json({ error: "Answer count mismatch" }, { status: 400 });
  }

  let correct = 0;
  questions.forEach((q: any, i: number) => {
    if (answers[i] === q.answer) correct++;
  });
  const grade = Math.round((correct / questions.length) * 100);

  const { error } = await admin
    .from("assignment_submissions")
    .update({
      status: "graded",
      cbt_answers: answers,
      grade,
      feedback: `Auto-graded: ${correct}/${questions.length} correct`,
      submitted_at: new Date().toISOString(),
    })
    .eq("id", submissionId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await admin.from("audit_log").insert({
    actor_id: user.id,
    action: "cbt_submitted",
    detail: { submissionId, grade, correct, total: questions.length },
  });

  return NextResponse.json({ grade, correct, total: questions.length });
}
