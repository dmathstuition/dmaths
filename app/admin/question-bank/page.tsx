import { supabaseAdmin } from "@/lib/supabase/admin";
import QuestionBankClient from "@/components/admin/QuestionBankClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "Question bank · D-Maths" };

// Staff-only: the /admin layout already gates this to admins, and the API
// re-checks on every write. Learners have no read path to this table at all.
const COLS_FULL = "id, subject, level, topic, exam, group_name, question, code, options, answer, owner_id, created_at";
const COLS_BASE = "id, subject, level, topic, question, code, options, answer, owner_id, created_at";

export default async function QuestionBankPage() {
  const admin = supabaseAdmin();
  const load = (cols: string) => admin.from("question_bank")
    .select(cols).order("created_at", { ascending: false }).limit(500);

  let { data, error } = await load(COLS_FULL);
  // Fall back to base columns if exam / group_name aren't migrated yet — so the
  // bank still loads, rather than looking un-migrated over one missing column.
  if (error && /column/i.test(error.message)) ({ data, error } = await load(COLS_BASE));

  return (
    <QuestionBankClient
      initial={(data as any) ?? []}
      needsMigration={!!error}
    />
  );
}
