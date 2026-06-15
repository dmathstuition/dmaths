"use client";
import { useState } from "react";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabase/client";
import PaystackButton from "@/components/PaystackButton";

const SUBJECTS = ["Algebra","Calculus","Statistics","Geometry","Further Mathematics","Core Maths Revision","Physics","JavaScript","Python","External Examinations"];
const LEVELS = ["JSS 1","JSS 2","JSS 3","SSS 1","SSS 2","SSS 3"];
const METHODS = ["Access Bank Transfer","Opay Bank Transfer","Cash"];

type Form = Record<string, any>;

export default function Apply() {
  const [step, setStep] = useState(1);
  const [f, setF] = useState<Form>({ subjects: [] as string[] });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [consent, setConsent] = useState(false);

  const set = (k: string, v: any) => setF(p => ({ ...p, [k]: v }));
  const toggleSubject = (s: string) =>
    set("subjects", f.subjects.includes(s) ? f.subjects.filter((x: string) => x !== s) : [...f.subjects, s]);

  function next() {
    setError("");
    if (step === 1 && !(f.first_name && f.last_name && f.email && f.phone))
      return setError("Please fill in all required fields.");
    if (step === 2) {
      if (!f.subjects.length) return setError("Select at least one subject.");
      if (!(f.guardian_name && f.guardian_contact)) return setError("Please provide guardian details.");
    }
    setStep(s => s + 1);
  }

  async function submit() {
    if (!consent) return setError("Please confirm you have read and agree to the policies before submitting.");
    setError("");
    if (!(f.payment_ref && f.payment_method && f.payment_amount))
      return setError("Please fill in all payment details.");
    setBusy(true);
    const supabase = supabaseBrowser();
    const { error: err } = await supabase.from("applications").insert({
      first_name: f.first_name, last_name: f.last_name, email: f.email, phone: f.phone,
      dob: f.dob || null, address: f.address || "", level: f.level || "JSS 1",
      guardian_name: f.guardian_name, guardian_contact: f.guardian_contact,
      subjects: f.subjects, notes: f.notes || "",
      payment_ref: f.payment_ref, payment_method: f.payment_method,
      payment_amount: Number(f.payment_amount), payment_date: f.payment_date || null,
      payment_verified: f.payment_verified === true,
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
          We verify payments within <strong>24 hours</strong>. Your Student ID and
          password will arrive at <strong>{f.email}</strong>.
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
            <Field label="Guardian contact" type="tel" required value={f.guardian_contact} onChange={v => set("guardian_contact", v)} />
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
              <Field label="Amount paid (₦)" type="number" required value={f.payment_amount} onChange={v => set("payment_amount", v)} />
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
            ? <button className="btn-gold" onClick={next}>Next step →</button>
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
          <Link href="/" className="font-display text-lg font-bold text-white">D-Maths</Link>
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
