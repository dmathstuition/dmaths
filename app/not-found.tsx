import Link from "next/link";
import Logo from "@/components/Logo";

export const metadata = { title: "Page not found — D-Maths Tuition Centre" };

export default function NotFound() {
  return (
    <main className="boardgrid flex min-h-screen flex-col items-center justify-center bg-board p-6 text-center text-white">
      <Logo light size="lg" />
      <p className="mt-8 font-display text-6xl font-extrabold text-gold">404</p>
      <h1 className="mt-2 font-display text-2xl font-semibold">Page not found</h1>
      <p className="mt-2 max-w-sm text-sm text-white/55">
        The page you're looking for doesn't exist or has moved.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link href="/" className="btn-gold !rounded-full !px-6">Back to home</Link>
        <Link href="/help" className="btn !rounded-full border border-white/30 bg-white/5 !px-6 text-white hover:bg-white/10">Get help</Link>
      </div>
    </main>
  );
}
