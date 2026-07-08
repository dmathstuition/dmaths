"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabase/client";
import { useToast } from "@/components/Toast";
import { Icon } from "@/components/Icons";
import FloatingMath from "@/components/landing/FloatingMath";
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

  useEffect(() => {
    setStandalone(
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as unknown as { standalone?: boolean }).standalone === true,
    );
  }, []);

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

    const { data: { user } } = await supabase.auth.getUser();
    const { data: profile } = await supabase
      .from("profiles").select("role, is_active").eq("id", user!.id).single();

    if (profile && profile.role === "student" && !profile.is_active) {
      await supabase.auth.signOut();
      setError("Your account is deactivated. Contact dmathstuition@gmail.com.");
      setBusy(false);
      return;
    }
    // Record last sign-in (accountability) — fire-and-forget, never blocks login.
    fetch("/api/auth/touch", { method: "POST" }).catch(() => {});

    // Reset the idle clock on this fresh sign-in. Without this, a stale timestamp
    // from a previous session makes IdleLogout sign the user straight back out on
    // arrival — an unbreakable "signed out after 30 minutes" loop.
    try { localStorage.setItem(IDLE_ACTIVITY_KEY, String(Date.now())); } catch {}

    const dest = profile?.role === "admin" ? "/admin" : profile?.role === "parent" ? "/parent" : "/portal";
    router.replace(dest);
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
    <main className="boardgrid relative flex min-h-screen items-center justify-center overflow-hidden bg-board p-5">
      <FloatingMath />
      <div className="hero-glow pointer-events-none absolute h-[32rem] w-[32rem] rounded-full" />
      <div className="relative z-10 w-full max-w-md page-enter">
        {!standalone && (
          <Link href="/" className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-white/45 hover:text-white/80">← Back to D-Maths</Link>
        )}
        <div className="overflow-hidden rounded-2xl bg-white shadow-lift">
          <div className="bg-ink p-7">
            <h1 className="font-display text-2xl font-semibold text-white">
              Sign in to your <span className="text-shimmer">portal</span>
            </h1>
            <p className="mt-1.5 text-sm text-white/45">Students use their Student ID. Parents and staff use their email.</p>
          </div>
          <form onSubmit={signIn} className="space-y-4 p-7">
            {notice && (
              <p role="status" className={`rounded-xl px-4 py-3 text-sm font-semibold ${notice.kind === "success" ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-800"}`}>
                {notice.text}
              </p>
            )}
            {error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">{error}</p>}
            <div>
              <label className="flabel" htmlFor="id">Student ID or email</label>
              <input id="id" className="field font-mono" placeholder="DM-2026-0001" autoComplete="username"
                value={identifier} onChange={e => setIdentifier(e.target.value)} required />
            </div>
            <div>
              <label className="flabel" htmlFor="pw">Password</label>
              <div className="relative">
                <input id="pw" type={showPw ? "text" : "password"} className="field pr-10" placeholder="••••••••" autoComplete="current-password"
                  value={password} onChange={e => setPassword(e.target.value)} required />
                <button type="button" onClick={() => setShowPw(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ink/40 hover:text-ink"
                  aria-label={showPw ? "Hide password" : "Show password"}>
                  <Icon name={showPw ? "eyeOff" : "eye"} />
                </button>
              </div>
            </div>
            <div className="flex justify-end">
              <button type="button" onClick={forgotPassword} className="text-[13px] font-bold text-gold-deep hover:underline">Forgot password?</button>
            </div>
            <button className="btn-gold w-full !min-h-[50px] !text-base" disabled={busy}>
              {busy ? "Signing in…" : "Sign in →"}
            </button>

            <div className="flex items-center gap-3 text-[11px] font-bold uppercase tracking-wider text-ink/30">
              <span className="h-px flex-1 bg-line" /> New to D-Maths? <span className="h-px flex-1 bg-line" />
            </div>
            <Link href="/apply"
              className="btn w-full !min-h-[48px] border border-gold/50 bg-white text-center text-gold-deep hover:bg-gold-pale">
              Create an account
            </Link>
          </form>
        </div>
      </div>
    </main>
  );
}
