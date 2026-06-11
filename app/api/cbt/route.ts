import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  const supa = supabaseServer();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { submissionId, answers } = await req.json();
  if (!submissionId || !answers) {
    return NextResponse.json({ error: "Missing submissionId or answers" }, { status: 400 });
  }

  // Fetch the submission and its assignment
  const { data: sub } = await supabaseAdmin
    .from("assignment_submissions")
    .select("*, assignment:assignments(cbt_questions, cbt_close)")
    .eq("id", submissionId)
    .eq("student_id", user.id)
    .single();

  if (!sub) return NextResponse.json({ error: "Submission not found" }, { status: 404 });
  if (sub.status !== "pending") {
    return NextResponse.json({ error: "Already submitted" }, { status: 400 });
  }

  // Check CBT window
  if (sub.assignment.cbt_close && new Date() > new Date(sub.assignment.cbt_close)) {
    return NextResponse.json({ error: "CBT window has closed" }, { status: 400 });
  }

  const questions = sub.assignment.cbt_questions as any[];
  if (!questions?.length) {
    return NextResponse.json({ error: "No questions found" }, { status: 400 });
  }

  // Auto-grade: compare answers to correct answers
  let correct = 0;
  questions.forEach((q: any, i: number) => {
    if (answers[i] === q.answer) correct++;
  });
  const grade = Math.round((correct / questions.length) * 100);

  // Update submission
  const { error } = await supabaseAdmin
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

  // Audit log
  await supabaseAdmin.from("audit_log").insert({
    actor_id: user.id,
    action: "cbt_submitted",
    detail: { submissionId, grade, correct, total: questions.length },
  });

  return NextResponse.json({ grade, correct, total: questions.length });
}
