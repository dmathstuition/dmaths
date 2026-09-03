import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireStaff } from "@/lib/authRole";
import { notifyUser } from "@/lib/notify";
import { sendEmail } from "@/lib/email";
import { loginUrl } from "@/lib/siteUrl";
import { aiChat, aiErrorResponse } from "@/lib/ai";
import { cleanQuestions, scoreAptitude, type AptitudeQuestion } from "@/lib/aptitude";

// Admin-only lifecycle actions on an aptitude test.
//   save     — replace the draft's questions (after editing the AI draft)
//   approve  — open it for the parent to schedule (status → scheduled)
//   analyze  — draft an A.I analysis of a submitted result (status → analyzed)
//   report   — release the admin-reviewed report to the family (status → reported)
//   delete   — remove a test
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: Request) {
  const staff = await requireStaff();
  if (!staff || staff.role !== "admin") return NextResponse.json({ error: "Admins only." }, { status: 403 });

  const b = await req.json().catch(() => null);
  const action = String(b?.action ?? "");
  const testId = String(b?.testId ?? "");
  if (!testId) return NextResponse.json({ error: "testId required" }, { status: 400 });

  const admin = supabaseAdmin();
  const { data: test } = await admin.from("aptitude_tests").select("*").eq("id", testId).maybeSingle();
  if (!test) return NextResponse.json({ error: "Test not found." }, { status: 404 });

  const notifyFamily = async (title: string, body: string, learnerLink: string, parentBody?: string) => {
    await notifyUser(admin, test.student_id, { title, body, link: learnerLink });
    const { data: stu } = await admin.from("profiles").select("first_name, email").eq("id", test.student_id).maybeSingle();
    if (stu?.email) await sendEmail("notice", stu.email, { firstName: stu.first_name || "there", title, body, loginUrl: loginUrl() });
    const { data: links } = await admin.from("parent_student_links").select("parent_id").eq("student_id", test.student_id);
    for (const l of links ?? []) {
      await notifyUser(admin, l.parent_id, { title, body: parentBody ?? body, link: "/parent" });
      const { data: p } = await admin.from("profiles").select("first_name, email").eq("id", l.parent_id).maybeSingle();
      if (p?.email) await sendEmail("notice", p.email, { firstName: p.first_name || "there", title, body: parentBody ?? body, loginUrl: loginUrl() });
    }
  };

  if (action === "save") {
    const questions = cleanQuestions(b?.questions);
    if (!questions.length) return NextResponse.json({ error: "Keep at least one valid question." }, { status: 400 });
    const patch: any = { questions };
    if (typeof b?.level === "string") patch.level = b.level.slice(0, 40);
    if (typeof b?.exam_target === "string") patch.exam_target = b.exam_target.slice(0, 80);
    const { error } = await admin.from("aptitude_tests").update(patch).eq("id", testId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (action === "approve") {
    if (test.status !== "draft") return NextResponse.json({ error: "Only a draft can be approved." }, { status: 400 });
    const { error } = await admin.from("aptitude_tests").update({ status: "scheduled" }).eq("id", testId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    await notifyFamily(
      "🗓️ Aptitude test ready to schedule",
      "Your aptitude test is ready — an adult can pick a time for it from the parent portal.",
      "/portal/aptitude",
      "An aptitude test is ready for your child — please pick a time for it in your parent portal.",
    );
    return NextResponse.json({ ok: true });
  }

  if (action === "analyze") {
    if (test.status !== "submitted") return NextResponse.json({ error: "Analyse only after the learner submits." }, { status: 400 });
    const questions = (test.questions ?? []) as AptitudeQuestion[];
    const answers = (test.answers ?? {}) as Record<string, number>;
    const s = scoreAptitude(questions, answers);
    const missed = questions
      .map((q, i) => ({ q, i }))
      .filter(({ q, i }) => answers[String(i)] !== q.answer)
      .map(({ q }) => `- ${q.question}`)
      .slice(0, 12)
      .join("\n");

    const { data: stu } = await admin.from("profiles").select("first_name, level, subjects").eq("id", test.student_id).maybeSingle();
    const system = `You are a head tutor at D-Maths writing a short performance analysis of a new learner's diagnostic aptitude test, for the learner's parent. Warm, specific, encouraging and honest.

Learner: ${stu?.first_name || "The learner"} · Class: ${stu?.level || test.level || "unknown"} · Classes: ${Array.isArray(stu?.subjects) ? stu!.subjects.join(", ") : ""}
Result: ${s.score}/${s.total} (${s.percent}%) — band: ${s.band}.
Questions answered incorrectly:
${missed || "(none — a clean sweep)"}

Write 120–180 words covering: how they performed overall, the specific strengths and gaps the answers reveal, and a concrete plan for how D-Maths will help (topics to target, and the kind of support). Plain paragraphs, no headings, no markdown.`;

    let analysis: string;
    try { analysis = await aiChat({ system, user: "Write the analysis now.", maxTokens: 700 }); }
    catch (err) { return aiErrorResponse(err); }

    const { error } = await admin.from("aptitude_tests").update({ ai_analysis: analysis.trim(), status: "analyzed" }).eq("id", testId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, analysis: analysis.trim(), score: s });
  }

  if (action === "report") {
    const report = String(b?.report ?? "").trim();
    if (!report) return NextResponse.json({ error: "Write the report before releasing it." }, { status: 400 });
    if (!["analyzed", "submitted", "reported"].includes(test.status)) {
      return NextResponse.json({ error: "This test isn't ready to report." }, { status: 400 });
    }
    const { error } = await admin.from("aptitude_tests")
      .update({ report: report.slice(0, 6000), status: "reported", reported_at: new Date().toISOString() }).eq("id", testId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    await notifyFamily(
      "📊 Aptitude test report ready",
      "Your aptitude test report is ready to read in your portal.",
      "/portal/aptitude",
      "Your child's aptitude test report is ready — you can read it in your parent portal.",
    );
    return NextResponse.json({ ok: true });
  }

  if (action === "delete") {
    const { error } = await admin.from("aptitude_tests").delete().eq("id", testId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action." }, { status: 400 });
}
