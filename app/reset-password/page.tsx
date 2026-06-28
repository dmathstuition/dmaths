"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabase/client";
import { Icon } from "@/components/Icons";

export default function ResetPassword() {
  const router = useRouter();
  const supabase = supabaseBrowser();
  const [ready, setReady] = useState(false);     // recovery session present?
  const [checked, setChecked] = useState(false); // finished the session check
  const [pw, setPw] = useState({ next: "", confirm: "" });
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // The /auth/confirm route established a (recovery) session before redirecting
  // here. If there's no session, the link was invalid or expired.
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setReady(!!data.user);
      setChecked(true);
    });
  }, [supabase]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (pw.next.length < 8) { setError("Password must be at least 8 characters."); return; }
    if (pw.next !== pw.confirm) { setError("Passwords do not match."); return; }
    setBusy(true);
    const { error: err } = await supabase.auth.updateUser({ password: pw.next });
    if (err) {
      setBusy(false);
      setError("Could not update your password. The link may have expired — request a new one.");
      return;
    }
    // New password set — sign out the recovery session and send them to sign in.
    await supabase.auth.signOut();
    router.replace("/login?reset=done");
  }

  return (
    <main className="boardgrid flex min-h-screen items-center justify-center bg-board p-5">
      <div className="w-full max-w-md">
        <Link href="/" className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-white/45 hover:text-white/80">← Back to D-Maths</Link>
        <div className="overflow-hidden rounded-2xl bg-white shadow-lift">
          <div className="bg-ink p-7">
            <h1 className="font-display text-2xl font-semibold text-white">Set a new password</h1>
            <p className="mt-1.5 text-sm text-white/45">Choose a new password for your D-Maths account.</p>
          </div>

          {!checked ? (
            <div className="p-7 text-center text-sm text-ink/50">Checking your reset link…</div>
          ) : !ready ? (
            <div className="space-y-4 p-7">
              <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">
                This reset link is invalid or has expired. Please request a new one.
              </p>
              <Link href="/login" className="btn-gold w-full !min-h-[48px]">Back to sign in →</Link>
            </div>
          ) : (
            <form onSubmit={save} className="space-y-4 p-7">
              {error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">{error}</p>}
              <div>
                <label className="flabel" htmlFor="pw">New password</label>
                <div className="relative">
                  <input id="pw" type={showPw ? "text" : "password"} className="field pr-10" placeholder="At least 8 characters" autoComplete="new-password"
                    value={pw.next} onChange={e => setPw({ ...pw, next: e.target.value })} required />
                  <button type="button" onClick={() => setShowPw(s => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-ink/40 hover:text-ink"
                    aria-label={showPw ? "Hide password" : "Show password"}>
                    <Icon name={showPw ? "eyeOff" : "eye"} />
                  </button>
                </div>
              </div>
              <div>
                <label className="flabel" htmlFor="pw2">Confirm new password</label>
                <input id="pw2" type={showPw ? "text" : "password"} className="field" placeholder="Re-enter password" autoComplete="new-password"
                  value={pw.confirm} onChange={e => setPw({ ...pw, confirm: e.target.value })} required />
              </div>
              <button className="btn-gold w-full !min-h-[50px] !text-base" disabled={busy}>
                {busy ? "Saving…" : "Update password →"}
              </button>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
