import Link from "next/link";
import MockPaperGenerator from "@/components/admin/MockPaperGenerator";
import { Icon } from "@/components/Icons";

export const dynamic = "force-dynamic";
export const metadata = { title: "Mock exams · D-Maths" };

// Where staff set up mock exams. Mock Exam mode pulls its questions from the
// question bank (filtered by subject/level and weighted to the learner's exam
// target), so "setting a mock" means putting exam-standard questions in the bank
// — which the A.I generator here does in one step.
export default function AdminMockExamsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold">Mock exams</h1>
        <p className="text-sm text-ink/50">Set exam-standard questions for mocks — generate a WAEC or JAMB paper, or add them by hand in the bank.</p>
      </div>

      <div className="card flex flex-wrap items-start gap-3 border-l-4 border-l-gold bg-gold-pale/40 p-5">
        <Icon name="helpCircle" className="mt-0.5 h-5 w-5 flex-shrink-0 text-gold-deep" />
        <div className="text-sm text-ink/70">
          <p className="font-bold text-ink">How mocks get their questions</p>
          <p className="mt-1">
            When a learner sits a mock, the paper is drawn from the <strong>question bank</strong> — matched to the subject and level, and weighted toward their exam target (WAEC, JAMB…). So to “set” a mock, you put exam-standard questions in the bank. Generate a paper below, review it, and save — it’s tagged with the exam and grouped so it’s easy to find and reuse.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link href="/admin/question-bank" className="btn-ghost !rounded-xl !py-1.5 text-sm">Open question bank →</Link>
            <Link href="/admin/mock-requests" className="btn-ghost !rounded-xl !py-1.5 text-sm">Mock requests →</Link>
          </div>
        </div>
      </div>

      <MockPaperGenerator />
    </div>
  );
}
