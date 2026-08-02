import MockExamClient from "@/components/portal/MockExamClient";
import { getProfile } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Mock Exam mode — learners sit a timed, exam-style paper pulled from the
// question bank and get a WAEC-style grade band + per-topic breakdown. All
// questions/grading go through /api/mock-exam (service role); this page just
// hands the client the learner's own subjects to pre-select a sensible default.
export default async function MockExamPage() {
  const me = await getProfile();
  return (
    <MockExamClient
      mySubjects={((me as any)?.subjects ?? []) as string[]}
      myLevel={((me as any)?.level ?? "") as string}
    />
  );
}
