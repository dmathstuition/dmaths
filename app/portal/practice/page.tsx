import PracticeClient from "@/components/portal/PracticeClient";
import { getProfile } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Self-practice quiz — learners sit rounds pulled from the question bank and
// earn a few reward points. All questions/grading go through /api/practice
// (service role), so this page just hands the client the learner's own subjects
// to pre-select a sensible default.
export default async function PracticePage() {
  const me = await getProfile();
  return (
    <PracticeClient
      mySubjects={((me as any)?.subjects ?? []) as string[]}
      myLevel={((me as any)?.level ?? "") as string}
    />
  );
}
