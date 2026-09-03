"use client";
import Logo from "@/components/Logo";
import HeroMascot from "@/components/HeroMascot";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Icon } from "@/components/Icons";
import { REGIONS, levelsFor, examsFor, DEFAULT_REGION } from "@/lib/regions";
import { PACKAGES, findPackage, packageSubjects, packageRate, type EnrolPackage } from "@/lib/packages";
import { fmtNgn } from "@/lib/pricing";

// New sign-ups choose a PACKAGE (Tier 1/2/3), not loose subjects. Tuition is
// billed automatically per month from attendance (see /pricing), so no payment
// is collected at sign-up — enrolment captures who the learner is, their
// package, and a short intake profile the tutors use to plan.
const DRAFT_KEY = "dmaths-apply-draft";

type Form = Record<string, any>;

export default function Apply() {
  const [step, setStep] = useState(1);
  const [f, setF] = useState<Form>({ subjects: [] as string[] });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [consent, setConsent] = useState(false);
  const [ref, setRef] = useState("");
  const [hp, setHp] = useState("");
  const [loadedAt] = useState(() => Date.now());

  const set = (k: string, v: any) => setF(p => ({ ...p, [k]: v }));
  const pkg: EnrolPackage | undefined = findPackage(f.package);

  const toggleSubject = (s: string) => {
    const has = f.subjects.includes(s);
    const cap = pkg?.maxSelectable ?? 99;
    if (!has && f.subjects.length >= cap) { setError(`Tier 2 covers up to ${cap} subjects.`); return; }
    setError("");
    set("subjects", has ? f.subjects.filter((x: string) => x !== s) : [...f.subjects, s]);
  };

  function pickPackage(p: EnrolPackage) {
    setError("");
    // Switching package clears any Tier-2 sub-selection.
    setF(prev => ({ ...prev, package: p.id, subjects: [] }));
  }

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(DRAFT_KEY);
      if (raw) {
        const d = JSON.parse(raw);
        if (d.f) setF(d.f);
        if (typeof d.step === "number") setStep(d.step);
        if (typeof d.ref === "string") setRef(d.ref);
        setConsent(!!d.consent);
        return;
      }
    } catch { /* ignore malformed draft */ }
    const params = new URLSearchParams(window.location.search);
    const r = (params.get("ref") || "").trim().slice(0, 40);
    if (r) setRef(r);
  }, []);

  useEffect(() => {
    if (done) return;
    try { sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ f, step, ref, consent })); } catch { /* non-fatal */ }
  }, [f, step, ref, consent, done]);

  const specialisedExam = !!(f.exam_target && f.exam_target.trim());

  function next() {
    setError("");
    if (step === 1) {
      if (!(f.first_name && f.last_name && f.email && f.phone)) return setError("Please fill in all required fields.");
    }
    if (step === 2) {
      if (!f.level) return setError("Please choose the learner's current class / year.");
      if (!pkg) return setError("Please choose a package.");
      if (pkg.selectableSubjects && f.subjects.length === 0) return setError("Pick at least one subject for Tier 2.");
    }
    setStep(s => s + 1);
  }

  async function submit() {
    setError("");
    if (!(f.guardian_name && f.guardian_contact)) return setError("Please provide guardian details.");
    if (!consent) return setError("Please confirm you have read and agree to the policies before submitting.");
    const subjects = pkg ? packageSubjects(pkg, f.subjects) : [];
    if (!subjects.length) return setError("Please choose a package on the previous step.");
    setBusy(true);
    const res = await fetch("/api/applications/submit", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        first_name: f.first_name, last_name: f.last_name, email: f.email, phone: f.phone,
        dob: f.dob || null, address: f.address || "",
        level: f.level || levelsFor(f.country || DEFAULT_REGION)[0],
        country: f.country || DEFAULT_REGION, exam_target: f.exam_target || "",
        package: f.package || "", subjects,
        school: f.school || "", availability: f.availability || "",
        guardian_name: f.guardian_name, guardian_contact: f.guardian_contact, guardian_email: f.guardian_email || "",
        notes: f.notes || "",
        strengths: f.strengths || "", challenges: f.challenges || "", weak_points: f.weak_points || "",
        exam_date: f.exam_date || null, target_grade: f.target_grade || "",
        ref: ref || "",
        website: hp, loadedAt,
      }),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setError(json.error || "Could not submit — please check your connection and try again.");
    try { sessionStorage.removeItem(DRAFT_KEY); } catch {}
    setDone(true);
  }

  if (done) return (
    <Shell>
      <div className="card mx-auto max-w-lg p-9 text-center">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-700"><Icon name="checkCircle" className="h-8 w-8" /></div>
        <h1 className="font-display text-2xl font-semibold">Registration submitted</h1>
        <p className="mt-3 text-sm leading-relaxed text-ink/55">
          Thank you! We&apos;ll review the registration and create the learner&apos;s account —
          the Student ID and password will arrive at <strong>{f.email}</strong> shortly.
        </p>
        <p className="mt-3 rounded-xl bg-gold-pale px-4 py-3 text-sm font-semibold text-ink/70">
          🎯 An aptitude test will be waiting in the portal so we can pitch teaching at the right level.
          Tuition is billed monthly from attendance — see <Link href="/pricing" className="underline">pricing</Link>.
        </p>
        <p className="mt-3 text-sm text-ink/55">📞 Our team will also contact you shortly to confirm the place.</p>
        <Link href="/" className="btn-ink mt-7 w-full">Return to D-Maths</Link>
      </div>
    </Shell>
  );

  return (
    <Shell>
      <div className="mx-auto mb-6 max-w-2xl">
        <div className="relative flex min-h-[136px] items-center overflow-hidden rounded-3xl bg-gradient-to-br from-[#EEF2FE] via-[#E2ECFB] to-[#DCE7F6] p-6 sm:p-7">
          <div className="relative z-10 max-w-[58%] sm:max-w-md">
            <h1 className="font-display text-2xl font-bold text-ink sm:text-3xl">Register with D-Maths</h1>
            <p className="mt-1 text-sm text-ink/55">Enrol in online maths, science &amp; coding tuition — it only takes a few minutes.</p>
          </div>
          <HeroMascot src="/avatars/student-book.png" className="absolute bottom-0 right-0 top-0 w-[42%] sm:right-2 sm:w-[38%]" />
        </div>
        {ref && (
          <p className="mt-3 flex items-center gap-2 rounded-2xl bg-gold-pale px-4 py-3 text-sm font-semibold text-ink/75">
            <Icon name="gift" className="h-4 w-4 shrink-0 text-gold-deep" />
            You&apos;re joining through a friend&apos;s invite — you&apos;ll both earn bonus reward points once the enrolment is approved.
          </p>
        )}
      </div>

      {/* Step bar */}
      <ol className="mx-auto mb-8 flex max-w-2xl items-center gap-3">
        {["Personal info", "Choose a package", "Details"].map((t, i) => {
          const n = i + 1, active = step === n, doneStep = step > n;
          return (
            <li key={t} className="flex flex-1 items-center gap-2.5">
              <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-extrabold
                ${doneStep ? "bg-emerald-500 text-white" : active ? "bg-gold text-board" : "bg-line text-ink/40"}`}>
                {doneStep ? "✓" : n}
              </span>
              <span className={`hidden text-[13px] font-bold sm:block ${active ? "text-ink" : "text-ink/40"}`}>{t}</span>
              {i < 2 && <span className={`h-0.5 flex-1 ${doneStep ? "bg-emerald-400" : "bg-line"}`} />}
            </li>
          );
        })}
      </ol>

      <div className="card mx-auto max-w-2xl p-7">
        {/* Honeypot */}
        <span aria-hidden style={{ position: "absolute", left: "-9999px", top: 0, width: 1, height: 1, overflow: "hidden", opacity: 0 }}>
          <label htmlFor="company_url">Company website (leave blank)</label>
          <input id="company_url" name="company_url" type="text" tabIndex={-1} autoComplete="off" value={hp} onChange={e => setHp(e.target.value)} />
        </span>

        {error && <p role="alert" className="mb-5 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">{error}</p>}

        {step === 1 && (
          <div className="space-y-4">
            <h2 className="font-display text-xl font-semibold">Personal information</h2>
            <Row>
              <Field label="First name" required value={f.first_name} onChange={v => set("first_name", v)} />
              <Field label="Last name" required value={f.last_name} onChange={v => set("last_name", v)} />
            </Row>
            <Row>
              <Field label="Email" type="email" required value={f.email} onChange={v => set("email", v)} />
              <Field label="Phone" type="tel" required placeholder="+234 XX XXX XXXX" value={f.phone} onChange={v => set("phone", v)} />
            </Row>
            <Row>
              <Field label="Date of birth" type="date" value={f.dob} onChange={v => set("dob", v)} />
              <Field label="Town / area" value={f.address} onChange={v => set("address", v)} />
            </Row>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5">
            <h2 className="font-display text-xl font-semibold">Choose a package</h2>
            <Row>
              <div>
                <label htmlFor="page-country" className="flabel">Where do you study? <Req /></label>
                <select id="page-country" className="field" value={f.country || DEFAULT_REGION}
                  onChange={e => { set("country", e.target.value); set("level", ""); }}>
                  {REGIONS.map(r => <option key={r.code} value={r.code}>{r.flag} {r.name}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="page-current-level" className="flabel">Current class / year <Req /></label>
                <select id="page-current-level" className="field" value={f.level || ""} onChange={e => set("level", e.target.value)}>
                  <option value="">Select…</option>
                  {levelsFor(f.country || DEFAULT_REGION).map(l => <option key={l}>{l}</option>)}
                </select>
              </div>
            </Row>

            <div className="space-y-3">
              {PACKAGES.map(p => {
                const on = f.package === p.id;
                return (
                  <div key={p.id}>
                    <button type="button" onClick={() => pickPackage(p)}
                      className={`w-full rounded-2xl border p-4 text-left transition ${on ? "border-gold bg-gold-pale ring-1 ring-gold/40" : "border-line bg-white hover:border-gold/40"}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-display text-base font-bold text-ink">{p.name}</p>
                          <p className="text-[12px] font-semibold text-ink/50">{p.tagline}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-display text-lg font-extrabold text-gold-deep">{fmtNgn(packageRate(p))}</p>
                          <p className="text-[11px] font-semibold text-ink/40">/ hour</p>
                        </div>
                      </div>
                      <ul className="mt-2 space-y-1">
                        {p.bullets.map(bl => (
                          <li key={bl} className="flex items-start gap-2 text-[12.5px] text-ink/60">
                            <svg className="mt-0.5 h-3 w-3 flex-shrink-0 text-gold-deep" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                            {bl}
                          </li>
                        ))}
                      </ul>
                    </button>

                    {/* Tier 2 — choose up to 3 subjects */}
                    {on && p.selectableSubjects && (
                      <div className="mt-2 rounded-2xl border border-line bg-chalk/40 p-4">
                        <p className="text-[13px] font-bold text-ink">Pick up to {p.maxSelectable} subjects <span className="font-normal text-ink/45">({f.subjects.length}/{p.maxSelectable})</span></p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {p.selectableSubjects.map(s => {
                            const sel = f.subjects.includes(s);
                            return (
                              <button type="button" key={s} onClick={() => toggleSubject(s)}
                                className={`rounded-full border px-3.5 py-1.5 text-[13px] font-semibold transition ${sel ? "border-gold bg-gold-pale text-gold-deep" : "border-line bg-white text-ink/70 hover:border-gold/40"}`}>
                                {s}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <p className="text-[12px] text-ink/45">
              Tuition is charged per hour and billed monthly from attendance — see our <Link href="/pricing" className="font-semibold text-gold-deep underline">pricing</Link>.
            </p>

            <div>
              <label htmlFor="page-exam-target" className="flabel">Preparing for a specialised exam?</label>
              <select id="page-exam-target" className="field" value={f.exam_target || ""} onChange={e => set("exam_target", e.target.value)}>
                <option value="">Not sure yet / general study</option>
                {examsFor(f.country || DEFAULT_REGION).map(x => <option key={x}>{x}</option>)}
              </select>
            </div>
            {specialisedExam && (
              <Row>
                <Field label="Target exam date" type="date" value={f.exam_date} onChange={v => set("exam_date", v)} />
                <Field label="Target grade / score" placeholder="e.g. A1, or 300+ in JAMB" value={f.target_grade} onChange={v => set("target_grade", v)} />
              </Row>
            )}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <h2 className="font-display text-xl font-semibold">A few more details</h2>
            {pkg && (
              <p className="rounded-xl border border-gold/40 bg-gold-pale/50 px-4 py-2.5 text-[13px] font-semibold text-ink/70">
                Selected: <strong className="text-ink">{pkg.name}</strong>
                {packageSubjects(pkg, f.subjects).length ? ` · ${packageSubjects(pkg, f.subjects).join(", ")}` : ""}
              </p>
            )}
            <Row>
              <Field label="Current school" value={f.school} onChange={v => set("school", v)} placeholder="e.g. Unity College" />
              <Field label="Preferred days / times" value={f.availability} onChange={v => set("availability", v)} placeholder="e.g. Weekday evenings, Sat mornings" />
            </Row>

            <div className="rounded-2xl border border-line bg-chalk/40 p-4">
              <p className="flex items-center gap-2 text-sm font-bold text-ink">
                <Icon name="lightbulb" className="h-4 w-4 text-gold-deep" /> Tell us about the learner
              </p>
              <p className="mt-0.5 text-[12px] text-ink/50">This shapes how we teach and levels the aptitude test.</p>
              <div className="mt-3 space-y-3">
                <TextArea label="Strengths observed" placeholder="e.g. Strong at arithmetic, quick to grasp new ideas" value={f.strengths} onChange={v => set("strengths", v)} />
                <TextArea label="Challenges faced" placeholder="e.g. Word problems, staying focused in long sessions" value={f.challenges} onChange={v => set("challenges", v)} />
                <TextArea label="Weak points observed" placeholder="e.g. Fractions, algebra, exam timing" value={f.weak_points} onChange={v => set("weak_points", v)} />
              </div>
            </div>

            <Row>
              <Field label="Guardian name" required value={f.guardian_name} onChange={v => set("guardian_name", v)} />
              <Field label="Guardian contact" type="tel" required value={f.guardian_contact} onChange={v => set("guardian_contact", v)} />
            </Row>
            <Field label="Guardian email" type="email" placeholder="parent@example.com" value={f.guardian_email} onChange={v => set("guardian_email", v)} />

            <div>
              <label htmlFor="page-notes-goals" className="flabel">Anything else / goals</label>
              <textarea id="page-notes-goals" className="field min-h-20" placeholder="e.g. Other goals, prior tutoring, learning needs…"
                value={f.notes || ""} onChange={e => set("notes", e.target.value)} />
            </div>

            <label className="mt-2 flex items-start gap-3 rounded-xl border border-line bg-chalk/50 p-4 text-sm text-ink/70">
              <input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} className="mt-0.5 h-4 w-4 accent-gold" />
              <span>
                I am the student or their parent/guardian, the information provided is accurate, and I
                have read and agree to the{" "}
                <a href="/privacy" className="font-semibold text-gold-deep underline">Privacy Policy</a>,{" "}
                <a href="/terms" className="font-semibold text-gold-deep underline">Terms of Service</a>, and{" "}
                <a href="/refunds" className="font-semibold text-gold-deep underline">Payment &amp; Refund Policy</a>.
                I consent to the processing of the student&apos;s information for the purpose of providing tuition.
              </span>
            </label>
          </div>
        )}

        <div className="mt-7 flex items-center justify-between">
          {step > 1 ? <button className="btn-ghost" onClick={() => setStep(s => s - 1)}>← Previous</button> : <span />}
          {step < 3
            ? <button className="btn-gold" onClick={next} disabled={busy}>Next step →</button>
            : <button className="btn-gold" onClick={submit} disabled={busy}>{busy ? "Submitting…" : "Submit registration"}</button>}
        </div>
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen pb-20" style={{ background: "linear-gradient(160deg, #EEF2FE 0%, #F6F8FC 42%, #FFFFFF 100%)" }}>
      <header className="relative overflow-hidden px-5 pb-11 pt-4 text-white"
        style={{ background: "linear-gradient(135deg, #10406F 0%, #0A2A4F 60%, #071C36 100%)" }}>
        <div aria-hidden className="pointer-events-none absolute -left-16 top-0 h-56 w-56 rounded-full bg-ink/40 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full bg-gold/20 blur-2xl" />
        <div className="relative mx-auto flex max-w-4xl items-center justify-between">
          <Link href="/"><Logo light /></Link>
          <Link href="/login" className="text-sm font-semibold text-white/80 hover:text-white">Already enrolled? Sign in</Link>
        </div>
        <svg className="absolute inset-x-0 bottom-[-1px] h-10 w-full" viewBox="0 0 500 40" preserveAspectRatio="none" aria-hidden="true">
          <path d="M0,40 L0,14 C160,40 340,40 500,14 L500,40 Z" fill="#EEF2FE" />
        </svg>
      </header>
      <div className="relative px-5 pt-8">{children}</div>
    </main>
  );
}
const Req = () => <span className="text-red-600">*</span>;
function Row({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-4 sm:grid-cols-2">{children}</div>;
}
function Field({ label, required, type = "text", placeholder, value, onChange }:
  { label: string; required?: boolean; type?: string; placeholder?: string; value: any; onChange: (v: string) => void }) {
  return (
    <div>
      <label htmlFor="page-field" className="flabel">{label} {required && <Req />}</label>
      <input id="page-field" className="field" type={type} placeholder={placeholder} value={value || ""}
        onChange={e => onChange(e.target.value)} required={required} />
    </div>
  );
}
function TextArea({ label, placeholder, value, onChange }:
  { label: string; placeholder?: string; value: any; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="flabel">{label}</label>
      <textarea className="field min-h-16" placeholder={placeholder} value={value || ""} onChange={e => onChange(e.target.value)} />
    </div>
  );
}
