"use client";
import Link from "next/link";
import { useEffect } from "react";
import Logo from "@/components/Logo";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Surface to the console; a monitoring tool (e.g. Sentry) would hook in here.
    console.error(error);
  }, [error]);

  return (
    <main className="boardgrid flex min-h-screen flex-col items-center justify-center bg-board p-6 text-center text-white">
      <Logo light size="lg" />
      <p className="mt-8 font-display text-5xl font-extrabold text-gold">Oops</p>
      <h1 className="mt-2 font-display text-2xl font-semibold">Something went wrong</h1>
      <p className="mt-2 max-w-sm text-sm text-white/55">
        An unexpected error occurred. Please try again — if it keeps happening, contact us at dmathstuition@gmail.com.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <button onClick={reset} className="btn-gold !rounded-full !px-6">Try again</button>
        <Link href="/" className="btn !rounded-full border border-white/30 bg-white/5 !px-6 text-white hover:bg-white/10">Back to home</Link>
      </div>
    </main>
  );
}
