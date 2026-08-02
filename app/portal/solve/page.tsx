import SolveClient from "@/components/portal/SolveClient";

export const dynamic = "force-dynamic";

// Question solver — paste or type a question and get a worked, step-by-step
// solution. All AI work happens in /api/ai/solve (auth-gated + rate-limited).
export default function SolvePage() {
  return <SolveClient />;
}
