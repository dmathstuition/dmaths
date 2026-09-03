"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/Icons";
import { useToast } from "@/components/Toast";
import { statusLabel } from "@/lib/aptitude";

type Student = { id: string; first_name: string | null; last_name: string | null; student_code: string | null; level: string | null };
type Q = { question: string; options: string[]; answer: number; segment?: string };
type Test = {
  id: string; student_id: string; student_name: string; level: string; exam_target: string;
  questions: Q[]; status: string; scheduled_at: string | null; score: number | null; total: number | null;
  ai_analysis: string | null; report: string | null; created_at: string; submitted_at: string | null;
};

const STATUS_STYLE: Record<string, string> = {
  draft: "bg-chalk text-ink/60", scheduled: "bg-blue-50 text-blue-700",
  submitted: "bg-amber-50 text-amber-700", analyzed: "bg-violet-50 text-violet-700",
  reported: "bg-emerald-50 text-emerald-700",
};

export default function AptitudeAdminClient({ students, initialTests, needsMigration }: {
  students: Student[]; initialTests: Test[]; needsMigration: boolean;
}) {
  const router = useRouter();
  const push = useToast();
  const [tests, setTests] = useState<Test[]>(initialTests);
  const [studentId, setStudentId] = useState("");
  const [count, setCount] = useState(10);
  const [busy, setBusy] = useState<string>(""); // "gen" or a test id
  // Editable report drafts, keyed by test id (seeded from ai_analysis).
  const [reportDraft, setReportDraft] = useState<Record<string, string>>({});
  const [schedAt, setSchedAt] = useState<Record<string, string>>({});

  const name = (s: Student) => `${s.first_name ?? ""} ${s.last_name ?? ""}`.trim() || s.student_code || "Student";
  const patch = (id: string, p: Partial<Test>) => setTests(ts => ts.map(t => t.id === id ? { ...t, ...p } : t));

  async function generate() {
    if (!studentId) { push("Pick a learner first.", "error"); return; }
    setBusy("gen");
    const res = await fetch("/api/aptitude/generate", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentId, count }),
    });
    const j = await res.json().catch(() => ({}));
    setBusy("");
    if (!res.ok) { push(j.error || "Could not generate.", "error"); return; }
    const s = students.find(x => x.id === studentId);
    setTests(ts => [{ ...j.test, student_name: s ? name(s) : "Student" }, ...ts]);
    push("Draft generated — preview and approve below.", "success");
    setStudentId("");
  }

  async function manage(id: string, action: string, extra: any = {}) {
    setBusy(id);
    const res = await fetch("/api/aptitude/manage", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ testId: id, action, ...extra }),
    });
    const j = await res.json().catch(() => ({}));
    setBusy("");
    if (!res.ok) { push(j.error || "Something went wrong.", "error"); return null; }
    return j;
  }

  async function save(t: Test) {
    const j = await manage(t.id, "save", { questions: t.questions, level: t.level, exam_target: t.exam_target });
    if (j) push("Saved.", "success");
  }
  async function approve(t: Test) {
    const j = await manage(t.id, "approve");
    if (j) { patch(t.id, { status: "scheduled" }); push("Approved — the family can now schedule it.", "success"); }
  }
  async function analyze(t: Test) {
    const j = await manage(t.id, "analyze");
    if (j) { patch(t.id, { status: "analyzed", ai_analysis: j.analysis }); setReportDraft(d => ({ ...d, [t.id]: j.analysis })); push("A.I analysis drafted — review and release.", "success"); }
  }
  async function release(t: Test) {
    const text = (reportDraft[t.id] ?? t.ai_analysis ?? "").trim();
    if (!text) { push("Write the report first.", "error"); return; }
    const j = await manage(t.id, "report", { report: text });
    if (j) { patch(t.id, { status: "reported", report: text }); push("Report released to the parent.", "success"); }
  }
  async function remove(t: Test) {
    if (!confirm("Delete this aptitude test?")) return;
    const j = await manage(t.id, "delete");
    if (j) setTests(ts => ts.filter(x => x.id !== t.id));
  }
  async function setTime(t: Test) {
    const v = schedAt[t.id];
    if (!v) { push("Pick a date and time.", "error"); return; }
    setBusy(t.id);
    const res = await fetch("/api/aptitude/schedule", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ testId: t.id, scheduledAt: new Date(v).toISOString() }),
    });
    const j = await res.json().catch(() => ({}));
    setBusy("");
    if (!res.ok) { push(j.error || "Could not set the time.", "error"); return; }
    patch(t.id, { scheduled_at: j.scheduledAt }); push("Time set.", "success");
  }

  // Draft question editing helpers.
  function editQ(t: Test, qi: number, updater: (q: Q) => Q) {
    patch(t.id, { questions: t.questions.map((q, i) => i === qi ? updater(q) : q) });
  }

  const fmt = (s: string | null) => s ? new Date(s).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" }) : "";

  const sorted = useMemo(() => tests, [tests]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold">Aptitude tests</h1>
        <p className="text-sm text-ink/50">Draft a leveled diagnostic with A.I, approve it for the family to schedule, then analyse the result and send the parent a report.</p>
      </div>

      {needsMigration && (
        <p role="alert" className="rounded-xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">
          Run <code>supabase/migration-aptitude.sql</code> in Supabase to enable aptitude tests.
        </p>
      )}

      {/* Generate */}
      <div className="card space-y-3 p-6">
        <h2 className="font-display text-lg font-semibold">New aptitude test</h2>
        <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
          <select className="field" value={studentId} onChange={e => setStudentId(e.target.value)}>
            <option value="">Choose a learner…</option>
            {students.map(s => <option key={s.id} value={s.id}>{name(s)}{s.level ? ` · ${s.level}` : ""}</option>)}
          </select>
          <select className="field !w-auto" value={count} onChange={e => setCount(Number(e.target.value))}>
            {[5, 8, 10, 12, 15].map(n => <option key={n} value={n}>{n} questions</option>)}
          </select>
          <button onClick={generate} disabled={busy === "gen" || needsMigration} className="btn-gold inline-flex items-center gap-2 disabled:opacity-50">
            <Icon name="sparkles" className="h-4 w-4" /> {busy === "gen" ? "Generating…" : "Generate with A.I"}
          </button>
        </div>
      </div>

      {/* Tests */}
      {sorted.length === 0 ? (
        <p className="card p-8 text-center text-sm text-ink/40">No aptitude tests yet.</p>
      ) : sorted.map(t => (
        <div key={t.id} className="card p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-display text-lg font-bold text-ink">{t.student_name}</h3>
              <p className="text-xs text-ink/50">
                {t.level || "—"}{t.exam_target ? ` · ${t.exam_target}` : ""} · {t.questions.length} questions
                {t.score != null && t.total != null ? ` · scored ${t.score}/${t.total}` : ""}
              </p>
            </div>
            <span className={`rounded-full px-3 py-1 text-[11px] font-extrabold uppercase tracking-wide ${STATUS_STYLE[t.status] ?? "bg-chalk text-ink/60"}`}>
              {statusLabel(t.status)}
            </span>
          </div>

          {/* DRAFT — preview & edit questions */}
          {t.status === "draft" && (
            <div className="mt-4 space-y-3">
              {t.questions.map((q, qi) => (
                <div key={qi} className="rounded-xl border border-line bg-chalk/30 p-4">
                  <input className="field mb-2 !h-8 text-[12px] font-bold text-ink/60" placeholder="Segment (e.g. English · Comprehension)"
                    value={q.segment ?? ""} onChange={e => editQ(t, qi, q => ({ ...q, segment: e.target.value }))} />
                  <div className="flex items-start gap-2">
                    <span className="mt-2 text-xs font-bold text-ink/40">{qi + 1}.</span>
                    <textarea className="field min-h-[52px] flex-1" value={q.question}
                      onChange={e => editQ(t, qi, q => ({ ...q, question: e.target.value }))} />
                    <button onClick={() => patch(t.id, { questions: t.questions.filter((_, i) => i !== qi) })}
                      aria-label="Remove question" className="mt-1 flex h-9 w-9 items-center justify-center rounded-lg text-ink/40 hover:bg-red-50 hover:text-red-600">
                      <Icon name="close" className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="mt-2 space-y-1.5 pl-6">
                    {q.options.map((o, oi) => (
                      <div key={oi} className="flex items-center gap-2">
                        <button type="button" onClick={() => editQ(t, qi, q => ({ ...q, answer: oi }))}
                          aria-label="Mark correct" aria-pressed={q.answer === oi}
                          className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border ${q.answer === oi ? "border-emerald-500 bg-emerald-50 text-emerald-600" : "border-line text-ink/30"}`}>
                          <Icon name="checkCircle" className="h-4 w-4" />
                        </button>
                        <input className="field" value={o}
                          onChange={e => editQ(t, qi, q => ({ ...q, options: q.options.map((x, i) => i === oi ? e.target.value : x) }))} />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              <div className="flex flex-wrap gap-2">
                <button onClick={() => save(t)} disabled={busy === t.id} className="btn border border-line bg-white text-ink/70 hover:bg-chalk">Save changes</button>
                <button onClick={() => approve(t)} disabled={busy === t.id} className="btn-gold">Approve for scheduling →</button>
                <button onClick={() => remove(t)} disabled={busy === t.id} className="btn border border-red-200 bg-red-50 text-red-700 hover:bg-red-100">Delete</button>
              </div>
            </div>
          )}

          {/* SCHEDULED — awaiting/at a time */}
          {t.status === "scheduled" && (
            <div className="mt-4 space-y-2">
              {t.scheduled_at
                ? <p className="text-sm text-ink/70">Scheduled for <strong>{fmt(t.scheduled_at)}</strong> (chosen at registration) — it opens in the learner's portal then.</p>
                : <p className="text-sm text-ink/60">No time was recorded at registration — set one below.</p>}
              <div className="flex flex-wrap items-center gap-2">
                <input type="datetime-local" className="field !w-auto" value={schedAt[t.id] ?? ""} onChange={e => setSchedAt(d => ({ ...d, [t.id]: e.target.value }))} />
                <button onClick={() => setTime(t)} disabled={busy === t.id} className="btn border border-line bg-white text-ink/70 hover:bg-chalk">{t.scheduled_at ? "Adjust time" : "Set time"}</button>
                <button onClick={() => remove(t)} disabled={busy === t.id} className="btn border border-red-200 bg-red-50 text-red-700 hover:bg-red-100">Delete</button>
              </div>
            </div>
          )}

          {/* SUBMITTED — run analysis */}
          {t.status === "submitted" && (
            <div className="mt-4">
              <p className="text-sm text-ink/70">The learner submitted{t.submitted_at ? ` on ${fmt(t.submitted_at)}` : ""}. Run the A.I analysis, then review and release the report.</p>
              <button onClick={() => analyze(t)} disabled={busy === t.id} className="btn-gold mt-3 inline-flex items-center gap-2">
                <Icon name="sparkles" className="h-4 w-4" /> {busy === t.id ? "Analysing…" : "Run A.I analysis"}
              </button>
            </div>
          )}

          {/* ANALYZED — review & release */}
          {t.status === "analyzed" && (
            <div className="mt-4 space-y-2">
              <p className="flabel">Report to the parent <span className="font-normal text-ink/40">(A.I draft — edit as needed)</span></p>
              <textarea className="field min-h-[180px]" value={reportDraft[t.id] ?? t.ai_analysis ?? ""}
                onChange={e => setReportDraft(d => ({ ...d, [t.id]: e.target.value }))} />
              <button onClick={() => release(t)} disabled={busy === t.id} className="btn-gold">Release report to parent →</button>
            </div>
          )}

          {/* REPORTED — read-only */}
          {t.status === "reported" && (
            <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50/50 p-4">
              <p className="text-[11px] font-bold uppercase tracking-wide text-emerald-700">Report sent to the family</p>
              <p className="mt-2 whitespace-pre-wrap text-[14px] leading-relaxed text-ink/75">{t.report}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
