"use client";
import Logo from "@/components/Logo";
import { useState, useEffect } from "react";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabase/client";
import PaystackButton from "@/components/PaystackButton";
import { SUMMER_CAMP_TIERS, findTier, fmtUsd, fmtNgn, DISCOUNT_PCT, discountedUsd, discountedNgn, depositNgn, balanceNgn, type CampTier } from "@/lib/summerCamp";

const SUBJECTS = ["Algebra","Calculus","Statistics","Geometry","Further Mathematics","Core Maths Revision","Physics","JavaScript","Python","Python Practice Challenge","External Examinations"];

// ── FREE ENROLMENT SWITCH ──────────────────────────────────────────
// When true, applicants whose ONLY paid concern is the free subject below
// skip the payment step entirely. Set to false (or remove the subject from
// FREE_SUBJECTS) to turn the promotion off. No other code changes needed.
const FREE_ENROLMENT_OPEN = true;
const FREE_SUBJECTS = ["Python Practice Challenge"];

function isFreeApplication(subjects: string[]) {
  return FREE_ENROLMENT_OPEN
    && subjects.length > 0
    && subjects.every((s) => FREE_SUBJECTS.includes(s));
}
const LEVELS = ["JSS 1","JSS 2","JSS 3","SSS 1","SSS 2","SSS 3","Post Secondary"];
const METHODS = ["Access Bank Transfer","Opay Bank Transfer","Cash"];

type Form = Record<string, any>;

export default function Apply() {
  const [step, setStep] = useState(1);
  const [f, setF] = useState<Form>({ subjects: [] as string[] });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [consent, setConsent] = useState(false);
  // Summer-camp tag from the URL (?camp=summer-2026&plan=<id>)
  const [camp, setCamp] = useState("");
  // Part payment: pay the full discounted price, or a 50% deposit now.
  const [payHalf, setPayHalf] = useState(false);

  const set = (k: string, v: any) => setF(p => ({ ...p, [k]: v }));
  const toggleSubject = (s: string) =>
    set("subjects", f.subjects.includes(s) ? f.subjects.filter((x: string) => x !== s) : [...f.subjects, s]);

  // When a tier is chosen, lock in its naira price (full or 50% deposit) and use
  // its name as the "subject" so the existing ≥1-subject validation passes.
  const selectTier = (t: CampTier) =>
    setF(p => ({ ...p, plan: t.id, payment_amount: payHalf ? depositNgn(t) : discountedNgn(t), subjects: [t.name] }));

  // Switch between paying in full and paying the 50% deposit.
  function setPayOption(half: boolean, t?: CampTier) {
    setPayHalf(half);
    if (t) set("payment_amount", half ? depositNgn(t) : discountedNgn(t));
  }

  // Read campaign params on mount. We read window.location.search directly
  // (instead of useSearchParams) to avoid the Next 14 CSR-bailout/Suspense rule.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const c = params.get("camp") || "";
    if (!c) return;
    setCamp(c);
    const tier = findTier(params.get("plan"));
    if (tier) selectTier(tier);
  }, []);

  const selectedTier = camp ? findTier(f.plan) : undefined;

  function next() {
    setError("");
    if (step === 1 && !(f.first_name && f.last_name && f.email && f.phone))
      return setError("Please fill in all required fields.");
    if (step === 2) {
      if (camp && !f.plan) return setError("Please choose a camp package.");
      if (!f.subjects.length) return setError("Select at least one subject.");
      if (!(f.guardian_name && f.guardian_contact)) return setError("Please provide guardian details.");
      // Free enrolment: skip the payment step and submit straight away.
      if (isFreeApplication(f.subjects)) { submitFree(); return; }
    }
    setStep(s => s + 1);
  }

  async function submitFree() {
    // Free-enrolment path: no payment, consent auto-accepted at submit.
    await doSubmit(true);
  }

  async function submit() {
    if (!consent) return setError("Please confirm you have read and agree to the policies before submitting.");
    setError("");
    if (!(f.payment_ref && f.payment_method && f.payment_amount))
      return setError("Please fill in all payment details.");
    await doSubmit(false);
  }

  async function doSubmit(free: boolean) {
    setError("");
    setBusy(true);
    const supabase = supabaseBrowser();
    const { error: err } = await supabase.from("applications").insert({
      first_name: f.first_name, last_name: f.last_name, email: f.email, phone: f.phone,
      dob: f.dob || null, address: f.address || "", level: f.level || "JSS 1",
      guardian_name: f.guardian_name, guardian_contact: f.guardian_contact,
      guardian_email: f.guardian_email || "",
      subjects: f.subjects, notes: f.notes || "",
      camp: camp || "", plan: f.plan || "",
      pay_plan: selectedTier && payHalf ? "part" : "full",
      payment_ref: free ? "FREE-ENROLMENT" : f.payment_ref,
      payment_method: free ? "Free promotion" : f.payment_method,
      payment_amount: free ? 0 : Number(f.payment_amount),
      payment_date: f.payment_date || null,
      // payment_verified is intentionally NOT sent from the browser. The DB
      // trigger forces it false on insert; only the server (Paystack verify /
      // webhook / approval gate) can ever set it true.
      consented_at: new Date().toISOString(),
    });
    setBusy(false);
    if (err) return setError("Could not submit — please check your connection and try again.");
    setDone(true);
  }

  if (done) return (
    <Shell>
      <div className="card mx-auto max-w-lg p-9 text-center">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 text-3xl">⏳</div>
        <h1 className="font-display text-2xl font-semibold">Application submitted</h1>
        <p className="mt-3 text-sm leading-relaxed text-ink/55">
          {isFreeApplication(f.subjects)
            ? <>Your registration is confirmed. Your Student ID and password will arrive at <strong>{f.email}</strong> shortly after we review it.</>
            : <>We verify payments within <strong>24 hours</strong>. Your Student ID and password will arrive at <strong>{f.email}</strong>.</>}
        </p>
        <p className="mt-3 rounded-xl bg-gold-pale px-4 py-3 text-sm font-semibold text-ink/70">
          📞 Our team will also contact you shortly to confirm your place.
        </p>
        <Link href="/" className="btn-ink mt-7 w-full">Return to D-Maths</Link>
      </div>
    </Shell>
  );

  return (
    <Shell>
      {/* Step bar */}
      <ol className="mx-auto mb-8 flex max-w-2xl items-center gap-3">
        {["Personal info","Academic details","Payment"].map((t, i) => {
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
          <div className="space-y-4">
            <h2 className="font-display text-xl font-semibold">Academic details</h2>
            <Row>
              <div>
                <label className="flabel">Current level <Req /></label>
                <select className="field" value={f.level || "JSS 1"} onChange={e => set("level", e.target.value)}>
                  {LEVELS.map(l => <option key={l}>{l}</option>)}
                </select>
              </div>
              <Field label="Guardian name" required value={f.guardian_name} onChange={v => set("guardian_name", v)} />
            </Row>
            <Row>
              <Field label="Guardian contact" type="tel" required value={f.guardian_contact} onChange={v => set("guardian_contact", v)} />
              <Field label="Guardian email" type="email" placeholder="parent@example.com" value={f.guardian_email} onChange={v => set("guardian_email", v)} />
            </Row>
            {camp ? (
              <div>
                <label className="flabel">
                  Summer camp package <Req />
                  {DISCOUNT_PCT > 0 && <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-extrabold text-emerald-700">{DISCOUNT_PCT}% off applied</span>}
                </label>
                <div className="grid gap-2.5 sm:grid-cols-2">
                  {SUMMER_CAMP_TIERS.map(t => {
                    const on = f.plan === t.id;
                    return (
                      <button type="button" key={t.id} onClick={() => selectTier(t)}
                        className={`rounded-2xl border p-3.5 text-left transition
                          ${on ? "border-gold bg-gold-pale ring-1 ring-gold/40" : "border-line bg-white hover:border-gold/40"}`}>
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="text-[13px] font-bold text-ink">{t.name}</span>
                          <span className="flex items-baseline gap-1.5">
                            <span className="font-display text-sm font-extrabold text-gold-deep">{fmtUsd(discountedUsd(t))}</span>
                            {DISCOUNT_PCT > 0 && <span className="text-[11px] font-semibold text-ink/30 line-through">{fmtUsd(t.usd)}</span>}
                          </span>
                        </div>
                        <p className="mt-1 text-[12px] leading-snug text-ink/55">{t.blurb}</p>
                        <p className="mt-1.5 text-[11px] font-semibold text-ink/40">
                          {fmtNgn(discountedNgn(t))}
                          {DISCOUNT_PCT > 0 && <span className="ml-1 text-ink/25 line-through">{fmtNgn(t.ngn)}</span>}
                          {" "}· whole summer
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div>
                <label className="flabel">Subjects needed <Req /></label>
                <div className="flex flex-wrap gap-2">
                  {SUBJECTS.map(s => {
                    const on = f.subjects.includes(s);
                    return (
                      <button type="button" key={s} onClick={() => toggleSubject(s)}
                        className={`rounded-full border px-3.5 py-1.5 text-[13px] font-semibold transition
                          ${on ? "border-gold bg-gold-pale text-gold-deep" : "border-line bg-white text-ink/70 hover:border-gold/40"}`}>
                        {s}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            <div>
              <label className="flabel">Notes / goals</label>
              <textarea className="field min-h-24" placeholder="e.g. Preparing for BECE, weak in integration…"
                value={f.notes || ""} onChange={e => set("notes", e.target.value)} />
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <h2 className="font-display text-xl font-semibold">Payment information</h2>

            {selectedTier && (
              <div className="flex items-center justify-between gap-3 rounded-xl border border-gold bg-gold-pale px-4 py-3">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wide text-gold-deep">
                    Summer camp package{DISCOUNT_PCT > 0 && ` · ${DISCOUNT_PCT}% off`}
                  </p>
                  <p className="text-sm font-bold text-ink">{selectedTier.name}</p>
                </div>
                <div className="text-right">
                  <p className="font-display text-xl font-extrabold text-ink">
                    {fmtNgn(discountedNgn(selectedTier))}
                    {DISCOUNT_PCT > 0 && <span className="ml-1.5 text-sm font-semibold text-ink/35 line-through">{fmtNgn(selectedTier.ngn)}</span>}
                  </p>
                  <p className="text-[11px] font-semibold text-ink/45">{fmtUsd(discountedUsd(selectedTier))} · whole summer</p>
                </div>
              </div>
            )}

            {/* Part payment option (camp only) */}
            {selectedTier && (
              <div>
                <label className="flabel">Payment option</label>
                <div className="grid gap-2.5 sm:grid-cols-2">
                  <button type="button" onClick={() => setPayOption(false, selectedTier)}
                    className={`rounded-2xl border p-3.5 text-left transition ${!payHalf ? "border-gold bg-gold-pale ring-1 ring-gold/40" : "border-line bg-white hover:border-gold/40"}`}>
                    <p className="text-[13px] font-bold text-ink">Pay in full</p>
                    <p className="mt-0.5 font-display text-lg font-extrabold text-gold-deep">{fmtNgn(discountedNgn(selectedTier))}</p>
                    <p className="text-[11px] text-ink/45">One payment · done</p>
                  </button>
                  <button type="button" onClick={() => setPayOption(true, selectedTier)}
                    className={`rounded-2xl border p-3.5 text-left transition ${payHalf ? "border-gold bg-gold-pale ring-1 ring-gold/40" : "border-line bg-white hover:border-gold/40"}`}>
                    <p className="text-[13px] font-bold text-ink">Pay half now</p>
                    <p className="mt-0.5 font-display text-lg font-extrabold text-gold-deep">{fmtNgn(depositNgn(selectedTier))}</p>
                    <p className="text-[11px] text-ink/45">Balance {fmtNgn(balanceNgn(selectedTier))} later</p>
                  </button>
                </div>
                {payHalf && (
                  <p className="mt-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] font-semibold text-amber-900">
                    You'll pay <strong>{fmtNgn(depositNgn(selectedTier))}</strong> now to secure your place. The remaining <strong>{fmtNgn(balanceNgn(selectedTier))}</strong> can be paid later — our team will arrange it with you.
                  </p>
                )}
              </div>
            )}

            <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">
              Send payment to <strong>Opay: 7025674894</strong> or <strong>Access Bank: 1534530227</strong>.
              Use your full name as the reference.
            </p>

            {f.payment_verified && (
              <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-900">
                ✓ Payment verified online — reference {f.payment_ref}. You can submit now.
              </p>
            )}

            {!f.payment_verified && (
              <div className="rounded-xl border border-line bg-white p-4">
                <p className="mb-3 text-sm font-semibold text-ink/70">
                  Option 1 — Pay online now (instant, optional):
                </p>
                <PaystackButton
                  email={f.email}
                  amount={Number(f.payment_amount) || 0}
                  plan={f.plan || ""}
                  camp={camp || ""}
                  onVerified={(ref, amt) => {
                    set("payment_ref", ref);
                    set("payment_amount", amt);
                    set("payment_method", "Paystack (verified)");
                    set("payment_verified", true);
                  }}
                />
                <p className="mt-3 text-center text-xs text-ink/40">— or pay by transfer and fill the details below —</p>
              </div>
            )}
            <Row>
              <Field label="Payment reference" required placeholder="e.g. PAY-8821" value={f.payment_ref} onChange={v => set("payment_ref", v)} />
              <div>
                <label className="flabel">Payment method <Req /></label>
                <select className="field" value={f.payment_method || ""} onChange={e => set("payment_method", e.target.value)}>
                  <option value="" disabled>Select method</option>
                  {METHODS.map(m => <option key={m}>{m}</option>)}
                </select>
              </div>
            </Row>
            <Row>
              {selectedTier ? (
                <div>
                  <label className="flabel">Amount due now (₦){payHalf ? " · half" : DISCOUNT_PCT > 0 ? ` · ${DISCOUNT_PCT}% off` : ""}</label>
                  <input className="field bg-chalk/60 font-bold" value={fmtNgn(payHalf ? depositNgn(selectedTier) : discountedNgn(selectedTier))} readOnly />
                </div>
              ) : (
                <Field label="Amount paid (₦)" type="number" required value={f.payment_amount} onChange={v => set("payment_amount", v)} />
              )}
              <Field label="Payment date" type="date" value={f.payment_date} onChange={v => set("payment_date", v)} />
            </Row>
          </div>
        )}

        {step === 3 && (
          <label className="mt-6 flex items-start gap-3 rounded-xl border border-line bg-chalk/50 p-4 text-sm text-ink/70">
            <input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-gold" />
            <span>
              I am the student or their parent/guardian, the information provided is accurate, and I
              have read and agree to the{" "}
              <a href="/privacy" target="_blank" className="font-semibold text-gold-deep underline">Privacy Policy</a>,{" "}
              <a href="/terms" target="_blank" className="font-semibold text-gold-deep underline">Terms of Service</a>, and{" "}
              <a href="/refunds" target="_blank" className="font-semibold text-gold-deep underline">Payment &amp; Refund Policy</a>.
              I consent to the processing of the student's information for the purpose of providing tuition.
            </span>
          </label>
        )}

        <div className="mt-7 flex items-center justify-between">
          {step > 1 ? <button className="btn-ghost" onClick={() => setStep(s => s - 1)}>← Previous</button> : <span />}
          {step < 3
            ? <button className="btn-gold" onClick={next} disabled={busy}>
                {step === 2 && isFreeApplication(f.subjects)
                  ? (busy ? "Submitting…" : "Submit registration →")
                  : "Next step →"}
              </button>
            : <button className="btn-gold" onClick={submit} disabled={busy}>{busy ? "Submitting…" : "Submit application"}</button>}
        </div>
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-chalk pb-20">
      <header className="bg-board px-5 py-4">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <Link href="/"><Logo light /></Link>
          <Link href="/login" className="text-sm font-semibold text-white/55 hover:text-white">Already enrolled? Sign in</Link>
        </div>
      </header>
      <div className="px-5 pt-10">{children}</div>
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
      <label className="flabel">{label} {required && <Req />}</label>
      <input className="field" type={type} placeholder={placeholder} value={value || ""}
        onChange={e => onChange(e.target.value)} required={required} />
    </div>
  );
}
