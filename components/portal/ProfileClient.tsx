"use client";
import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";

export default function ProfileClient({ me }: { me: any }) {
  const supabase = supabaseBrowser();
  const [pw, setPw] = useState({ next: "", confirm: "" });
  const [msg, setMsg] = useState("");

  async function changePassword() {
    setMsg("");
    if (pw.next.length < 8) return setMsg("Password must be at least 8 characters.");
    if (pw.next !== pw.confirm) return setMsg("Passwords do not match.");
    const { error } = await supabase.auth.updateUser({ password: pw.next });
    setMsg(error ? "Could not update password — try signing in again." : "Password updated successfully.");
    if (!error) setPw({ next: "", confirm: "" });
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
      <div className="card p-6 text-center">
        <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-ink font-display text-2xl font-bold text-gold-soft">
          {me.first_name?.[0]}{me.last_name?.[0]}
        </div>
        <h1 className="font-display text-xl font-semibold">{me.first_name} {me.last_name}</h1>
        <p className="font-mono text-sm text-ink/45">{me.student_code}</p>
        <p className="pill-gold mt-3">{me.level}</p>
        <div className="mt-5 grid grid-cols-2 gap-3 border-t border-line pt-5">
          <div><p className="font-display text-2xl font-semibold text-emerald-600">{me.avg_score}%</p><p className="text-[11px] font-bold text-ink/40">Avg score</p></div>
          <div><p className="font-display text-2xl font-semibold text-blue-600">{me.attendance}%</p><p className="text-[11px] font-bold text-ink/40">Attendance</p></div>
        </div>
        <div className="mt-4 flex flex-wrap justify-center gap-1.5">
          {(me.subjects ?? []).map((s: string) => <span key={s} className="pill-blue">{s}</span>)}
        </div>
      </div>

      <div className="space-y-5">
        <div className="card p-6">
          <h2 className="mb-4 font-display text-lg font-semibold">Personal details</h2>
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            {[["Email", me.email],["Phone", me.phone],["Date of birth", me.dob],["Address", me.address],
              ["Guardian", me.guardian_name],["Guardian contact", me.guardian_contact]].map(([k, v]) => (
              <div key={k as string}>
                <dt className="text-[11px] font-bold uppercase tracking-wide text-ink/35">{k}</dt>
                <dd className="font-semibold text-ink/75">{v || "—"}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="card p-6">
          <h2 className="mb-4 font-display text-lg font-semibold">Change password</h2>
          {msg && <p className="mb-3 rounded-xl bg-chalk px-4 py-2.5 text-sm font-semibold">{msg}</p>}
          <div className="grid gap-3 sm:grid-cols-2">
            <input className="field" type="password" placeholder="New password (min 8 chars)" autoComplete="new-password"
              value={pw.next} onChange={e => setPw({ ...pw, next: e.target.value })} />
            <input className="field" type="password" placeholder="Confirm new password" autoComplete="new-password"
              value={pw.confirm} onChange={e => setPw({ ...pw, confirm: e.target.value })} />
          </div>
          <button className="btn-gold mt-4" onClick={changePassword}>Update password</button>
        </div>
      </div>
    </div>
  );
}
