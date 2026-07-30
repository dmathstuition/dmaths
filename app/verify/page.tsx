import Link from "next/link";
import Logo from "@/components/Logo";
import VerifyForm from "@/components/VerifyForm";

export const metadata = {
  title: "Verify a certificate — D-Maths Tuition Centre",
  description: "Confirm that a D-Maths certificate or report card is genuine.",
};

// Public, no login. Anyone holding a printed certificate or report card can
// confirm it's real by its code. (This route is outside the middleware auth
// matcher, so it's reachable by outsiders.)
export default function VerifyLanding() {
  return (
    <main className="boardgrid flex min-h-screen flex-col items-center justify-center bg-board p-6 text-center text-white">
      <Link href="/"><Logo light size="lg" /></Link>
      <h1 className="mt-8 font-display text-3xl font-bold">Verify a document</h1>
      <p className="mt-2 max-w-md text-sm text-white/55">
        Enter the code printed on a D-Maths certificate or report card to confirm it&apos;s genuine.
        You&apos;ll see the learner&apos;s name and when it was issued — nothing else.
      </p>
      <div className="mt-8 flex justify-center">
        <VerifyForm />
      </div>
      <Link href="/" className="mt-10 text-sm font-semibold text-white/50 hover:text-white">← Back to D-Maths</Link>
    </main>
  );
}
