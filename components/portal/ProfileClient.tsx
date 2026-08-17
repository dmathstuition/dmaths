"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import { useToast } from "@/components/Toast";
import { Icon } from "@/components/Icons";
import ProgressRing from "@/components/ui/ProgressRing";
import { EDITABLE_LEVELS } from "@/lib/profileEdit";
import { ACADEMY_SUBJECTS, normalizeSubjects } from "@/lib/subjects";

const DETAIL_FIELDS: { key: string; label: string; type?: string; placeholder?: string }[] = [
  { key: "school", label: "School", placeholder: "Your school" },
  { key: "phone", label: "Phone", type: "tel", placeholder: "080…" },
  { key: "dob", label: "Date of birth", type: "date" },
  { key: "address", label: "Address", placeholder: "Where you live" },
  { key: "guardian_name", label: "Guardian", placeholder: "Parent / guardian name" },
  { key: "guardian_contact", label: "Guardian contact", type: "tel", placeholder: "Guardian phone" },
];

export default function ProfileClient({ me }: { me: any }) {
  const supabase = supabaseBrowser();
  const router = useRouter();
  const push = useToast();
  const [pw, setPw] = useState({ next: "", confirm: "" });
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [busy, setBusy] = useState(false);

  // ── Editable personal details ──
  const [editing, setEditing] = useState(false);
  const [savingDetails, setSavingDetails] = useState(false);
  const [form, setForm] = useState(() => ({
    level: me.level ?? "",
    subjects: normalizeSubjects(me.subjects) as string[],
    school: me.school ?? "",
    phone: me.phone ?? "",
    dob: me.dob ?? "",
    address: me.address ?? "",
    guardian_name: me.guardian_name ?? "",
    guardian_contact: me.guardian_contact ?? "",
  }));

  function startEdit() {
    setForm({
      level: me.level ?? "", subjects: normalizeSubjects(me.subjects), school: me.school ?? "", phone: me.phone ?? "",
      dob: me.dob ?? "", address: me.address ?? "", guardian_name: me.guardian_name ?? "",
      guardian_contact: me.guardian_contact ?? "",
    });
    setEditing(true);
  }

  function toggleSubject(s: string) {
    setForm((f) => ({ ...f, subjects: f.subjects.includes(s) ? f.subjects.filter((x) => x !== s) : [...f.subjects, s] }));
  }

  async function saveDetails() {
    setSavingDetails(true);
    try {
      const res = await fetch("/api/profile", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) { push(j.error || "Couldn't save your details.", "error"); return; }
      const levelChanged = (form.level ?? "") !== (me.level ?? "");
      push(levelChanged ? "Details saved — your teacher has been notified of your class change." : "Details saved.", "success");
      setEditing(false);
      router.refresh();
    } finally { setSavingDetails(false); }
  }

  async function changePassword() {
    if (pw.next.length < 8) { push("Password must be at least 8 characters.", "error"); return; }
    if (pw.next !== pw.confirm) { push("Passwords do not match.", "error"); return; }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pw.next });
    setBusy(false);
    if (error) {
      push("Could not update password — try signing in again.", "error");
    } else {
      push("Password updated successfully.", "success");
      setPw({ next: "", confirm: "" });
    }
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
          <div className="flex flex-col items-center gap-1.5">
            <ProgressRing value={me.avg_score} size={72} stroke={7} color="#059669">
              <span className="font-display text-base font-bold text-ink">{me.avg_score}%</span>
            </ProgressRing>
            <p className="text-[11px] font-bold text-ink/40">Avg score</p>
          </div>
          <div className="flex flex-col items-center gap-1.5">
            <ProgressRing value={me.attendance} size={72} stroke={7} color="#1A60AB">
              <span className="font-display text-base font-bold text-ink">{me.attendance}%</span>
            </ProgressRing>
            <p className="text-[11px] font-bold text-ink/40">Attendance</p>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap justify-center gap-1.5">
          {normalizeSubjects(me.subjects).map((s: string) => <span key={s} className="pill-blue">{s}</span>)}
        </div>
      </div>

      <div className="space-y-5">
        <div className="card p-6">
          <div className="mb-4 flex items-center justify-between gap-2">
            <h2 className="font-display text-lg font-semibold">Personal details</h2>
            {!editing && (
              <button onClick={startEdit} className="rounded-xl border border-line px-3 py-1.5 text-sm font-bold text-ink/70 hover:bg-chalk">
                Edit
              </button>
            )}
          </div>

          {!editing ? (
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              {[["Class / year group", me.level],["Email", me.email],["School", me.school],["Phone", me.phone],
                ["Date of birth", me.dob],["Address", me.address],["Guardian", me.guardian_name],["Guardian contact", me.guardian_contact]].map(([k, v]) => (
                <div key={k as string}>
                  <dt className="text-[11px] font-bold uppercase tracking-wide text-ink/35">{k}</dt>
                  <dd className="font-semibold text-ink/75">{v || "—"}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor="pf-level" className="flabel">Class / year group</label>
                  <select id="pf-level" className="field" value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })}>
                    <option value="">Not set</option>
                    {EDITABLE_LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
                <div>
                  <span className="flabel">Email</span>
                  <p className="field flex items-center bg-chalk/60 text-ink/45">{me.email} <span className="ml-auto text-[11px]">ask staff to change</span></p>
                </div>
                {DETAIL_FIELDS.map((f) => (
                  <div key={f.key}>
                    <label htmlFor={`pf-${f.key}`} className="flabel">{f.label}</label>
                    <input id={`pf-${f.key}`} type={f.type ?? "text"} className="field" placeholder={f.placeholder}
                      value={(form as any)[f.key]} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} />
                  </div>
                ))}
              </div>

              {/* Subjects — chosen from the academy's list */}
              <div>
                <span className="flabel">My subjects <span className="font-normal text-ink/40">(pick the ones you take)</span></span>
                <div className="flex flex-wrap gap-2">
                  {ACADEMY_SUBJECTS.map((s) => {
                    const on = form.subjects.includes(s);
                    return (
                      <button type="button" key={s} onClick={() => toggleSubject(s)} aria-pressed={on}
                        className={`rounded-full border px-3.5 py-1.5 text-sm font-bold transition ${on ? "border-gold bg-gold-pale text-gold-deep" : "border-line bg-white text-ink/55 hover:border-gold/40"}`}>
                        {on ? "✓ " : ""}{s}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                <button onClick={saveDetails} disabled={savingDetails} className="btn-gold">{savingDetails ? "Saving…" : "Save details"}</button>
                <button onClick={() => setEditing(false)} disabled={savingDetails} className="btn-ghost">Cancel</button>
              </div>
              <p className="text-[12px] text-ink/45">Changing your class lets your teacher know, so your classes and mock exams match.</p>
            </div>
          )}
        </div>

        <div className="card p-6">
          <h2 className="mb-4 font-display text-lg font-semibold">Change password</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="relative">
              <input className="field pr-10" type={showNewPw ? "text" : "password"} placeholder="New password (min 8 chars)" autoComplete="new-password"
                value={pw.next} onChange={e => setPw({ ...pw, next: e.target.value })} />
              <button type="button" onClick={() => setShowNewPw(s => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-ink/40 hover:text-ink"
                aria-label={showNewPw ? "Hide password" : "Show password"}>
                <Icon name={showNewPw ? "eyeOff" : "eye"} />
              </button>
            </div>
            <div className="relative">
              <input className="field pr-10" type={showConfirmPw ? "text" : "password"} placeholder="Confirm new password" autoComplete="new-password"
                value={pw.confirm} onChange={e => setPw({ ...pw, confirm: e.target.value })} />
              <button type="button" onClick={() => setShowConfirmPw(s => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-ink/40 hover:text-ink"
                aria-label={showConfirmPw ? "Hide password" : "Show password"}>
                <Icon name={showConfirmPw ? "eyeOff" : "eye"} />
              </button>
            </div>
          </div>
          <button className="btn-gold mt-4" onClick={changePassword} disabled={busy}>
            {busy
              ? <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              : "Update password"}
          </button>
        </div>
      </div>
    </div>
  );
}
