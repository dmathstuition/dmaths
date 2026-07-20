"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/Icons";
import { useToast } from "@/components/Toast";
import { fmtWAT } from "@/lib/time";

type Student = { id: string; first_name: string | null; last_name: string | null; student_code: string | null };
type ClassRow = { id: string; subject: string; starts_at: string };
type Cert = { id: string; student_id: string; title: string; subtitle: string | null; issued_at: string; serial: string; student_name: string };

const TITLE_PRESETS = [
  "Certificate of Completion",
  "Certificate of Achievement",
  "Certificate of Participation",
  "Certificate of Excellence",
];

export default function CertificatesClient({ students, classes, issued }: { students: Student[]; classes: ClassRow[]; issued: Cert[] }) {
  const router = useRouter();
  const push = useToast();
  const [mode, setMode] = useState<"student" | "class">("student");
  const [f, setF] = useState({ studentId: "", classId: "", title: TITLE_PRESETS[0], subtitle: "", note: "" });
  const [busy, setBusy] = useState(false);

  const name = (s: Student) => `${s.first_name ?? ""} ${s.last_name ?? ""}`.trim() || s.student_code || "Student";

  async function issue() {
    if (mode === "student" && !f.studentId) { push("Choose a student first.", "error"); return; }
    if (mode === "class" && !f.classId) { push("Choose a class first.", "error"); return; }
    if (!f.title.trim()) { push("A certificate title is required.", "error"); return; }
    if (mode === "class" && !confirm("Issue this certificate to every active student in the class?")) return;
    setBusy(true);
    const res = await fetch("/api/certificates", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...(mode === "student" ? { studentId: f.studentId } : { classId: f.classId }),
        title: f.title, subtitle: f.subtitle, note: f.note,
      }),
    });
    setBusy(false);
    const j = await res.json().catch(() => ({}));
    if (!res.ok) { push(j.error || "Could not issue the certificate.", "error"); return; }
    const n = j.issued ?? 1;
    push(`${n} certificate${n === 1 ? "" : "s"} issued — student${n === 1 ? "" : "s"} notified.`, "success");
    setF({ studentId: "", classId: "", title: TITLE_PRESETS[0], subtitle: "", note: "" });
    router.refresh();
  }

  async function revoke(id: string) {
    if (!confirm("Revoke this certificate? The student will no longer be able to view it.")) return;
    const res = await fetch(`/api/certificates?id=${id}`, { method: "DELETE" });
    if (!res.ok) { push("Could not revoke the certificate.", "error"); return; }
    push("Certificate revoked.", "success");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="boardgrid relative overflow-hidden rounded-2xl bg-board p-7 text-white">
        <h1 className="font-display text-2xl font-semibold sm:text-3xl">🎓 Certificates</h1>
        <p className="mt-1 text-sm text-white/50">Issue branded certificates — students download them from their portal.</p>
      </div>

      {/* Issue form */}
      <div className="card p-6">
        <h2 className="mb-4 font-display text-lg font-semibold">Issue a certificate</h2>

        {/* who: one student or a whole class */}
        <div className="mb-3 flex flex-wrap gap-2">
          {([["student", "One student"], ["class", "A whole class"]] as const).map(([id, label]) => (
            <button key={id} type="button" onClick={() => setMode(id)}
              className={`flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold transition ${
                mode === id ? "border-gold bg-gold-pale text-gold-deep" : "border-line bg-white text-ink/60 hover:bg-chalk"}`}>
              <Icon name={id === "class" ? "classes" : "profile"} className="h-4 w-4" /> {label}
            </button>
          ))}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            {mode === "student" ? (
              <>
                <label className="flabel">Student</label>
                <select className="field" value={f.studentId} onChange={e => setF({ ...f, studentId: e.target.value })}>
                  <option value="">Choose a student…</option>
                  {students.map(s => <option key={s.id} value={s.id}>{name(s)}{s.student_code ? ` · ${s.student_code}` : ""}</option>)}
                </select>
              </>
            ) : (
              <>
                <label className="flabel">Class</label>
                <select className="field" value={f.classId} onChange={e => setF({ ...f, classId: e.target.value })}>
                  <option value="">Choose a class…</option>
                  {classes.map(c => <option key={c.id} value={c.id}>{c.subject} · {fmtWAT(c.starts_at)}</option>)}
                </select>
                <p className="mt-1 text-[11px] text-ink/45">Issues one certificate to every active student in the class.</p>
              </>
            )}
          </div>
          <div>
            <label className="flabel">Title</label>
            <input className="field" list="cert-titles" value={f.title}
              onChange={e => setF({ ...f, title: e.target.value })} placeholder="Certificate of Completion" />
            <datalist id="cert-titles">{TITLE_PRESETS.map(t => <option key={t} value={t} />)}</datalist>
          </div>
          <div>
            <label className="flabel">Subtitle <span className="text-ink/40">(optional)</span></label>
            <input className="field" value={f.subtitle}
              onChange={e => setF({ ...f, subtitle: e.target.value })} placeholder="Summer Coding Camp 2026" />
          </div>
          <div>
            <label className="flabel">Note <span className="text-ink/40">(optional)</span></label>
            <input className="field" value={f.note}
              onChange={e => setF({ ...f, note: e.target.value })} placeholder="For outstanding progress in Python and problem-solving." />
          </div>
        </div>
        <button className="btn-gold mt-4 inline-flex items-center gap-2" onClick={issue} disabled={busy}>
          <Icon name="graduationCap" className="h-4 w-4" /> {busy ? "Issuing…" : "Issue certificate"}
        </button>
      </div>

      {/* Issued list */}
      <div className="card neu-card overflow-hidden">
        <div className="border-b border-line px-6 py-4">
          <h2 className="font-display text-lg font-semibold text-ink">Issued ({issued.length})</h2>
        </div>
        {issued.length ? (
          <div className="divide-y divide-line/60">
            {issued.map(c => (
              <div key={c.id} className="flex items-center gap-3 px-5 py-3.5">
                <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-gold-pale text-gold-deep">
                  <Icon name="trophy" className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-ink">{c.student_name}</p>
                  <p className="truncate text-xs text-ink/50">
                    {c.title}{c.subtitle ? ` · ${c.subtitle}` : ""} · {new Date(c.issued_at).toLocaleDateString("en-NG", { dateStyle: "medium" })}
                  </p>
                </div>
                <Link href={`/certificate/${c.id}`} className="flex-shrink-0 rounded-lg border border-line px-3 py-1.5 text-xs font-bold text-ink hover:bg-chalk">
                  View
                </Link>
                <button onClick={() => revoke(c.id)}
                  className="flex-shrink-0 rounded-lg px-2 py-1.5 text-xs font-bold text-red-500 hover:bg-red-50">
                  Revoke
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="p-6 text-center text-sm text-ink/40">No certificates issued yet.</p>
        )}
      </div>
    </div>
  );
}
