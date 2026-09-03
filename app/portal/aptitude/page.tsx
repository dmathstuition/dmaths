import AptitudeClient from "@/components/portal/AptitudeClient";
import { getUser } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";
export const metadata = { title: "Aptitude test · D-Maths" };

export default async function AptitudePage() {
  const user = await getUser();
  if (!user) redirect("/login");

  const admin = supabaseAdmin();
  // The learner's most recent aptitude test. Table may not be migrated yet.
  let test: any = null;
  try {
    const { data } = await admin.from("aptitude_tests")
      .select("id, status, scheduled_at, questions, score, total, report, submitted_at")
      .eq("student_id", user.id).order("created_at", { ascending: false }).limit(1).maybeSingle();
    test = data ?? null;
  } catch { test = null; }

  // Never send the answer key to the browser — strip it for the taking view.
  const safe = test ? {
    id: test.id,
    status: test.status,
    scheduled_at: test.scheduled_at,
    score: test.score, total: test.total,
    report: test.status === "reported" ? test.report : null,
    questions: (test.questions ?? []).map((q: any) => ({ question: q.question, options: q.options })),
  } : null;

  return <AptitudeClient test={safe} />;
}
