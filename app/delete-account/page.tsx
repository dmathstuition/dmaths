import Link from "next/link";
import Logo from "@/components/Logo";

export const metadata = {
  title: "Delete your account · D-Maths Tuition",
  description: "How to permanently delete your D-Maths account and data.",
  alternates: { canonical: "/delete-account" },
};

// Public page (no login required) explaining how to delete a D-Maths account.
// Google Play's Data safety form requires a web link where users can request
// account deletion — this is that link.
export default function DeleteAccountPage() {
  return (
    <main className="min-h-screen bg-chalk pb-20">
      <header className="bg-board px-5 py-4">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <Link href="/"><Logo light /></Link>
          <Link href="/login" className="text-sm font-semibold text-white/55 hover:text-white">Sign in</Link>
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-5 pt-10">
        <h1 className="font-display text-3xl font-bold">Delete your D-Maths account</h1>
        <p className="mt-3 text-[15px] leading-relaxed text-ink/60">
          You can permanently delete your account and all data linked to it at any time.
          Deletion removes your login, profile, grades, attendance, messages, rewards,
          notifications and payment history. <strong>This cannot be undone.</strong>
        </p>

        <div className="card mt-8 p-6">
          <h2 className="font-display text-lg font-semibold">Delete it yourself (fastest)</h2>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-relaxed text-ink/70">
            <li><Link href="/login" className="font-semibold text-gold-deep underline">Sign in</Link> to your portal.</li>
            <li>Students: open <strong>Profile</strong>. Parents: scroll to the bottom of your portal.</li>
            <li>Tap <strong>“Delete my account”</strong>, type <span className="font-mono font-bold">DELETE</span> to confirm, and confirm.</li>
          </ol>
          <p className="mt-3 text-sm text-ink/55">Your account and data are removed immediately.</p>
        </div>

        <div className="card mt-4 p-6">
          <h2 className="font-display text-lg font-semibold">Or ask us to do it</h2>
          <p className="mt-2 text-sm leading-relaxed text-ink/70">
            Email <a href="mailto:dmathstuition@gmail.com?subject=Delete%20my%20account"
              className="font-semibold text-gold-deep underline">dmathstuition@gmail.com</a>{" "}
            from the address on your account (or include your Student ID) with the subject
            “Delete my account”. We action requests within <strong>7 days</strong>.
          </p>
        </div>

        <p className="mt-6 text-xs leading-relaxed text-ink/40">
          Note: where the law requires it (e.g. financial/tax records of payments), we may
          retain the minimum necessary records after deletion, kept only as long as legally
          required. See our <Link href="/privacy" className="underline">Privacy Policy</Link>.
        </p>
      </div>
    </main>
  );
}
