import { supabaseAdmin } from "@/lib/supabase/admin";
import QuestionBankClient from "@/components/admin/QuestionBankClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "Question bank · D-Maths" };

// Staff-only: the /admin layout already gates this to admins, and the API
// re-checks on every write. Learners have no read path to this table at all.
export default async function QuestionBankPage() {
  const { data, error } = await supabaseAdmin()
    .from("question_bank")
    .select("id, subject, level, topic, question, code, options, answer, owner_id, created_at")
    .order("created_at", { ascending: false })
    .limit(500);

  return (
    <QuestionBankClient
      initial={data ?? []}
      needsMigration={!!error}
    />
  );
}
