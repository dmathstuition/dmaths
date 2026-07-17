"use client";
import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { useToast } from "@/components/Toast";
import { Icon } from "@/components/Icons";

// Admin two-factor auth (TOTP) via Supabase MFA. Enrol an authenticator app
// (Google Authenticator, Authy, 1Password…), then every future admin sign-in
// requires the 6-digit code as a second step.
type Factor = { id: string; status: string; friendly_name?: string | null };

export default function TwoFactorSetup() {
  const supabase = supabaseBrowser();
  const push = useToast();
  const [factors, setFactors] = useState<Factor[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // Enrolment-in-progress state
  const [enrolling, setEnrolling] = useState(false);
  const [qr, setQr] = useState("");
  const [secret, setSecret] = useState("");
  const [factorId, setFactorId] = useState("");
  const [code, setCode] = useState("");

  const verified = factors.find((f) => f.status === "verified");

  async function load() {
    const { data } = await supabase.auth.mfa.listFactors();
    setFactors(((data as any)?.all ?? []) as Factor[]);
    setLoading(false);
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  async function startEnroll() {
    setBusy(true); setError("");
    // Clear any stale unverified factor so enrolment doesn't collide.
    const { data: all } = await supabase.auth.mfa.listFactors();
    for (const f of ((all as any)?.all ?? [])) {
      if (f.status !== "verified") await supabase.auth.mfa.unenroll({ factorId: f.id });
    }
    const { data, error: e } = await supabase.auth.mfa.enroll({
      factorType: "totp", friendlyName: `D-Maths admin ${Date.now()}`,
    });
    setBusy(false);
    if (e || !data) { setError(e?.message || "Could not start 2FA setup."); return; }
    setQr((data as any).totp.qr_code);
    setSecret((data as any).totp.secret);
    setFactorId(data.id);
    setEnrolling(true);
    setCode("");
  }

  async function confirmEnroll(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError("");
    const { data: ch, error: chErr } = await supabase.auth.mfa.challenge({ factorId });
    if (chErr || !ch) { setBusy(false); setError("Could not verify — try again."); return; }
    const { error: vErr } = await supabase.auth.mfa.verify({ factorId, challengeId: ch.id, code: code.trim() });
    setBusy(false);
    if (vErr) { setError("That code isn't right. Check your authenticator and try again."); return; }
    setEnrolling(false); setQr(""); setSecret(""); setFactorId("");
    await load();
    push("Two-factor authentication is now on. 🔒", "success");
  }

  async function disable() {
    if (!verified) return;
    if (!window.confirm("Turn off two-factor authentication for this admin account?")) return;
    setBusy(true); setError("");
    // Remove every factor (verified + any leftovers).
    for (const f of factors) await supabase.auth.mfa.unenroll({ factorId: f.id });
    setBusy(false);
    await load();
    push("Two-factor authentication turned off.", "success");
  }

  if (loading) return <div className="card p-6 text-sm text-ink/40">Loading…</div>;

  return (
    <div className="card p-6">
      <div className="flex items-start gap-3">
        <span className={`flex h-11 w-11 items-center justify-center rounded-2xl ${verified ? "bg-emerald-50 text-emerald-600" : "bg-gold-pale text-gold-deep"}`}>
          <Icon name="lock" className="h-5 w-5" />
        </span>
        <div className="flex-1">
          <h2 className="font-display text-lg font-bold">Two-factor authentication</h2>
          <p className="text-sm text-ink/55">
            {verified
              ? "On — sign-in requires a code from your authenticator app."
              : "Add a second step at sign-in with an authenticator app (Google Authenticator, Authy…). Strongly recommended for the admin account."}
          </p>
        </div>
        <span className={`pill ${verified ? "pill-green" : "bg-ink/10 text-ink/50"}`}>{verified ? "Enabled" : "Off"}</span>
      </div>

      {error && <p role="alert" className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">{error}</p>}

      {/* Enrolment flow */}
      {enrolling ? (
        <form onSubmit={confirmEnroll} className="mt-5 border-t border-line pt-5">
          <p className="text-sm font-semibold text-ink/70">1. Scan this with your authenticator app</p>
          {qr && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={qr} alt="2FA QR code" className="mt-3 h-44 w-44 rounded-xl border border-line bg-white p-2" />
          )}
          {secret && (
            <p className="mt-2 text-xs text-ink/45">Can't scan? Enter this key manually: <code className="rounded bg-chalk px-1.5 py-0.5 font-mono text-ink/70">{secret}</code></p>
          )}
          <p className="mt-4 text-sm font-semibold text-ink/70">2. Enter the 6-digit code it shows</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <input inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} placeholder="123456"
              className="field w-36 text-center font-mono text-lg tracking-widest" />
            <button className="btn-gold !min-h-[44px]" disabled={busy || code.length !== 6}>{busy ? "Verifying…" : "Turn on 2FA"}</button>
            <button type="button" className="btn-ghost !min-h-[44px]" onClick={() => { setEnrolling(false); setError(""); }}>Cancel</button>
          </div>
        </form>
      ) : (
        <div className="mt-5 border-t border-line pt-5">
          {verified ? (
            <button className="btn-danger !min-h-[42px]" onClick={disable} disabled={busy}>Turn off 2FA</button>
          ) : (
            <button className="btn-gold !min-h-[42px]" onClick={startEnroll} disabled={busy}>{busy ? "Starting…" : "Enable 2FA"}</button>
          )}
        </div>
      )}
    </div>
  );
}
