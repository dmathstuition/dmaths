"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabase/client";
import { useToast } from "@/components/Toast";
import { Icon } from "@/components/Icons";
import { IDLE_ACTIVITY_KEY } from "@/components/IdleLogout";

export default function Login() {
  const [notice, setNotice] = useState<{ kind: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.has("gone")) {
      // an orphaned / deleted / inactive account was bounced here — clear it
      import("@/lib/supabase/client").then(({ supabaseBrowser }) => {
        supabaseBrowser().auth.signOut();
      });
    }
    if (params.get("reset") === "done") {
      setNotice({ kind: "success", text: "Password updated — sign in with your new password." });
    } else if (params.get("error") === "reset") {
      setNotice({ kind: "error", text: "That reset link is invalid or has expired — please request a new one." });
    } else if (params.get("timeout") === "1") {
      setNotice({ kind: "success", text: "You were signed out after 30 minutes of inactivity, for your security." });
    } else if (params.get("deleted") === "1") {
      setNotice({ kind: "success", text: "Your account and data have been permanently deleted. We're sorry to see you go." });
    }
  }, []);

  const router = useRouter();
  const supabase = supabaseBrowser();
  const push = useToast();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [standalone, setStandalone] = useState(false);
  // Two-factor step-up state.
  const [mfaRequired, setMfaRequired] = useState(false);
  const [mfaCode, setMfaCode] = useState("");

  useEffect(() => {
    setStandalone(
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as unknown as { standalone?: boolean }).standalone === true,
    );
    // If a session already exists but is only password-level (e.g. bounced back
    // from /admin), jump straight to the 2FA code step.
    supabase.auth.mfa.getAuthenticatorAssuranceLevel().then(({ data }) => {
      if (data?.currentLevel === "aal1" && data?.nextLevel === "aal2") setMfaRequired(true);
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Runs once the session is fully authenticated (aal2 if 2FA is on): route the
  // user to their portal.
  async function finishLogin() {
    const { data: { user } } = await supabase.auth.getUser();
    const { data: profile } = await supabase
      .from("profiles").select("role, is_active").eq("id", user!.id).single();

    if (profile && profile.role === "student" && !profile.is_active) {
      await supabase.auth.signOut();
      setError("Your account is deactivated. Contact dmathstuition@gmail.com.");
      setBusy(false);
      return;
    }
    fetch("/api/auth/touch", { method: "POST" }).catch(() => {});
    try { localStorage.setItem(IDLE_ACTIVITY_KEY, String(Date.now())); } catch {}

    const dest = profile?.role === "admin" ? "/admin" : profile?.role === "tutor" ? "/tutor" : profile?.role === "parent" ? "/parent" : "/portal";
    router.replace(dest);
  }

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);

    // Accept either a Student ID (DM-2026-0001) or an email
    let email = identifier.trim();
    if (!email.includes("@")) {
      const { data } = await supabase.rpc("student_code_to_email", { code: email });
      if (!data) {
        setError("No active account found for that Student ID.");
        setBusy(false);
        return;
      }
      email = data;
    }

    const { error: authErr } = await supabase.auth.signInWithPassword({ email, password });
    if (authErr) {
      setError("Invalid credentials. Check your ID/email and password.");
      setBusy(false);
      return;
    }

    // Does this account require a second factor? (Password gives aal1; a verified
    // TOTP factor means we must step up to aal2 before letting them in.)
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aal?.currentLevel === "aal1" && aal?.nextLevel === "aal2") {
      setMfaRequired(true);
      setBusy(false);
      return;
    }

    await finishLogin();
  }

  async function verifyMfa(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const { data: factors } = await supabase.auth.mfa.listFactors();
    const totp = (factors as any)?.totp?.[0];
    if (!totp) { setError("No authenticator is set up. Contact support."); setBusy(false); return; }
    const { data: ch, error: chErr } = await supabase.auth.mfa.challenge({ factorId: totp.id });
    if (chErr || !ch) { setError("Could not verify — please try again."); setBusy(false); return; }
    const { error: vErr } = await supabase.auth.mfa.verify({ factorId: totp.id, challengeId: ch.id, code: mfaCode.trim() });
    if (vErr) { setError("That code isn't right. Check your authenticator and try again."); setBusy(false); return; }
    await finishLogin();
  }

  async function cancelMfa() {
    await supabase.auth.signOut();
    setMfaRequired(false);
    setMfaCode("");
    setPassword("");
  }

  async function forgotPassword() {
    let email = identifier.trim();
    if (!email) { setError("Enter your Student ID or email first, then tap 'Forgot password'."); return; }
    if (!email.includes("@")) {
      const { data } = await supabase.rpc("student_code_to_email", { code: email });
      if (!data) { setError("No account found for that Student ID."); return; }
      email = data;
    }
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/confirm?next=/reset-password`,
    });
    setError("");
    push("If an account exists, a reset link has been sent to its email address.", "success");
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden p-5"
      style={{ background: "linear-gradient(160deg, #FDF3E3 0%, #FBFAF6 45%, #FFFFFF 100%)" }}>
      {/* soft warm depth blobs */}
      <div className="pointer-events-none absolute -left-24 -top-24 h-96 w-96 rounded-full bg-gold/25 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-28 -right-20 h-96 w-96 rounded-full bg-gold-soft/30 blur-3xl" />

      <div className="relative z-10 w-full max-w-md page-enter">
        {!standalone && (
          <Link href="/" className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-ink/45 hover:text-ink/80">← Back to D-Maths</Link>
        )}

        <div className="overflow-hidden rounded-[2rem] bg-white shadow-[0_24px_70px_-15px_rgba(200,136,31,0.35)] ring-1 ring-gold/10">
          {/* Curved gold header — the "Terra" look, in D-Maths gold */}
          <div className="relative px-8 pt-9 pb-16 text-white"
            style={{ background: "linear-gradient(135deg, #F4C078 0%, #EFAE56 45%, #C8881F 100%)" }}>
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/25 backdrop-blur-sm ring-1 ring-white/40">
                <Icon name="graduationCap" className="h-6 w-6 text-white" />
              </span>
            </div>
            <h1 className="mt-5 font-display text-[1.75rem] font-extrabold leading-tight">{mfaRequired ? "Two-step verification" : "Welcome back"}</h1>
            <p className="mt-1 text-sm text-white/80">{mfaRequired ? "Enter the code from your authenticator app." : "Sign in to your D-Maths portal."}</p>
            {/* white curved base */}
            <svg className="absolute inset-x-0 bottom-[-1px] h-12 w-full" viewBox="0 0 500 48" preserveAspectRatio="none" aria-hidden="true">
              <path d="M0,48 L0,18 C160,46 340,46 500,18 L500,48 Z" fill="#fff" />
            </svg>
          </div>

          {mfaRequired ? (
            <form onSubmit={verifyMfa} className="space-y-4 px-8 pb-8 pt-2">
              {error && <p role="alert" className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">{error}</p>}
              <div>
                <label className="mb-1.5 block text-[13px] font-bold text-ink/60" htmlFor="mfa">Authentication code</label>
                <input id="mfa" inputMode="numeric" autoComplete="one-time-code" maxLength={6} autoFocus required
                  value={mfaCode} onChange={e => setMfaCode(e.target.value.replace(/\D/g, ""))} placeholder="123456"
                  className="terra-field text-center font-mono text-xl tracking-[0.4em]" />
                <p className="mt-1.5 text-xs text-ink/45">Open your authenticator app and enter the current 6-digit code.</p>
              </div>
              <button disabled={busy || mfaCode.length !== 6}
                className="w-full rounded-2xl py-4 text-base font-bold text-white shadow-lg shadow-gold/30 transition hover:brightness-[1.04] active:scale-[.99] disabled:opacity-60"
                style={{ background: "linear-gradient(135deg, #EFAE56 0%, #C8881F 100%)" }}>
                {busy ? "Verifying…" : "Verify & sign in"}
              </button>
              <button type="button" onClick={cancelMfa} className="block w-full text-center text-sm font-semibold text-ink/45 hover:text-ink">
                Use a different account
              </button>
            </form>
          ) : (
          <form onSubmit={signIn} className="space-y-4 px-8 pb-8 pt-2">
            {notice && (
              <p role="status" className={`rounded-2xl px-4 py-3 text-sm font-semibold ${notice.kind === "success" ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-800"}`}>
                {notice.text}
              </p>
            )}
            {error && <p role="alert" className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">{error}</p>}

            <div>
              <label className="mb-1.5 block text-[13px] font-bold text-ink/60" htmlFor="id">Student ID or email</label>
              <div className="relative">
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gold-deep/60">
                  <Icon name="mail" />
                </span>
                <input id="id" className="terra-field pl-11 font-mono" placeholder="DM-2026-0001" autoComplete="username"
                  value={identifier} onChange={e => setIdentifier(e.target.value)} required />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-[13px] font-bold text-ink/60" htmlFor="pw">Password</label>
              <div className="relative">
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gold-deep/60">
                  <Icon name="lock" />
                </span>
                <input id="pw" type={showPw ? "text" : "password"} className="terra-field pl-11 pr-11" placeholder="••••••••" autoComplete="current-password"
                  value={password} onChange={e => setPassword(e.target.value)} required />
                <button type="button" onClick={() => setShowPw(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ink/35 hover:text-ink"
                  aria-label={showPw ? "Hide password" : "Show password"}>
                  <Icon name={showPw ? "eyeOff" : "eye"} />
                </button>
              </div>
            </div>

            <div className="flex justify-end">
              <button type="button" onClick={forgotPassword} className="text-[13px] font-bold text-gold-deep hover:underline">Forgot password?</button>
            </div>

            <button disabled={busy}
              className="w-full rounded-2xl py-4 text-base font-bold text-white shadow-lg shadow-gold/30 transition hover:brightness-[1.04] active:scale-[.99] disabled:opacity-60"
              style={{ background: "linear-gradient(135deg, #EFAE56 0%, #C8881F 100%)" }}>
              {busy ? "Signing in…" : "Sign In"}
            </button>

            <p className="pt-1 text-center text-sm text-ink/50">
              New around here?{" "}
              <Link href="/apply" className="font-bold text-gold-deep hover:underline">Create account</Link>
            </p>
          </form>
          )}
        </div>

        <p className="mt-5 text-center text-xs text-ink/40">Students use their Student ID · Parents &amp; staff use their email</p>
      </div>
    </main>
  );
}
