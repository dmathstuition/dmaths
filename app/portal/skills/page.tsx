import { getProfile } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { buildSkillMap } from "@/lib/skillTree";
import SkillTree from "@/components/portal/SkillTree";

export const dynamic = "force-dynamic";

// Knowledge map — question-bank topics (scoped to the learner's subjects)
// coloured by the mastery accumulated in topic_mastery from practice + mocks.
// Both sources degrade to empty before their migrations are run.
export default async function SkillsPage() {
  const me = await getProfile();
  const admin = supabaseAdmin();
  const mySubjects = ((me as any)?.subjects ?? []) as string[];

  const [{ data: bank }, { data: mastery }] = await Promise.all([
    admin.from("question_bank").select("subject, topic").limit(5000),
    admin.from("topic_mastery").select("subject, topic, correct, total").eq("student_id", me?.id ?? ""),
  ]);

  let allTopics = (bank ?? []).filter((r: any) => r.topic);
  if (mySubjects.length) allTopics = allTopics.filter((r: any) => mySubjects.includes(r.subject));

  return <SkillTree map={buildSkillMap(allTopics as any, (mastery ?? []) as any)} />;
}
