"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/Icons";
import ConfirmModal from "@/components/ConfirmModal";
import { useToast } from "@/components/Toast";
import EmptyState from "@/components/ui/EmptyState";
import { MAX_OPTIONS, validateQuestion, type BankRow } from "@/lib/questionBank";

const SUBJECTS = ["Algebra", "Calculus", "Statistics", "Geometry", "Further Mathematics",
  "Core Maths Revision", "Physics", "English", "JavaScript", "Python", "External Examinations"];
const LEVELS = ["", "Primary", "JSS 1", "JSS 2", "JSS 3", "SS 1", "SS 2", "SS 3"];

const BLANK = {
  id: "", subject: SUBJECTS[0], level: "", topic: "",
  question: "", code: "", options: ["", "", "", ""], answer: 0,
};

// Write a question once, reuse it every term. Tests keep their own copy of the
// questions they were built from, so editing here never changes a test already
// sat by a learner.
export default function QuestionBankClient({
  initial, needsMigration,
}: {
  initial: BankRow[]; needsMigration: boolean;
}) {
  const router = useRouter();
  const push = useToast();
  const [rows, setRows] = useState<BankRow[]>(initial);
  const [f, setF] = useState<typeof BLANK>({ ...BLANK });
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<BankRow | null>(null);

  const [subject, setSubject] = useState("");
  const [level, setLevel] = useState("");
  const [search, setSearch] = useState("");

  // ── A.I question generator ──
  const [genOpen, setGenOpen] = useState(false);
  const [gen, setGen] = useState({ subject: SUBJECTS[0], level: "", topic: "", count: 5 });
  const [genBusy, setGenBusy] = useState(false);
  const [genErr, setGenErr] = useState("");
  const [generated, setGenerated] = useState<{ question: string; options: string[]; answer: number }[]>([]);

  async function generate() {
    setGenBusy(true); setGenErr(""); setGenerated([]);
    try {
      const res = await fetch("/api/ai/questions", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(gen),
      });
      const j = await res.json();
      if (!res.ok) { setGenErr(j.error || "Couldn't generate — try again."); return; }
      setGenerated(j.questions ?? []);
    } catch { setGenErr("Couldn't generate — try again."); }
    finally { setGenBusy(false); }
  }

  async function saveGenerated() {
    if (!generated.length) return;
    const n = generated.length;
    setGenBusy(true); setGenErr("");
    try {
      const res = await fetch("/api/question-bank", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questions: generated, subject: gen.subject, level: gen.level, topic: gen.topic }),
      });
      const j = await res.json().catch(() => ({}));
      setGenBusy(false);
      if (!res.ok) {
        const msg = j.error || "Couldn't save the questions.";
        setGenErr(msg); push(msg, "error");   // keep `generated` so nothing is lost
        return;
      }
      push(`${n} question${n === 1 ? "" : "s"} saved to the bank.`, "success");
      setGenerated([]); setGenOpen(false);
      // Clear the filters so the newly-saved questions are visible in the list.
      setSubject(""); setLevel(""); setSearch("");
      // Show the saved rows immediately (don't wait on a possibly-cached refetch).
      if (Array.isArray(j.rows) && j.rows.length) {
        setRows((prev) => [...(j.rows as BankRow[]), ...prev]);
        router.refresh();
      } else {
        await reload();
      }
    } catch {
      setGenBusy(false);
      setGenErr("Couldn't reach the server — try again."); push("Couldn't save — try again.", "error");
    }
  }

  function dropGenerated(idx: number) {
    setGenerated((g) => g.filter((_, i) => i !== idx));
  }

  const visible = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return rows.filter((r) =>
      (!subject || r.subject === subject) &&
      (!level || r.level === level) &&
      (!needle || r.question.toLowerCase().includes(needle) || (r.topic ?? "").toLowerCase().includes(needle)),
    );
  }, [rows, subject, level, search]);

  const topics = useMemo(
    () => [...new Set(rows.map((r) => r.topic).filter(Boolean))].sort(),
    [rows],
  );

  async function reload() {
    const res = await fetch("/api/question-bank", { cache: "no-store" });
    const j = await res.json().catch(() => ({}));
    setRows(j.questions ?? []);
    router.refresh();
  }

  function edit(r: BankRow) {
    setF({
      id: r.id, subject: r.subject || SUBJECTS[0], level: r.level ?? "", topic: r.topic ?? "",
      question: r.question, code: r.code ?? "",
      options: [...(r.options ?? [])], answer: r.answer ?? 0,
    });
    setError("");
    setShowForm(true);
  }

  async function save() {
    const problem = validateQuestion(f);
    if (problem) { setError(problem); return; }
    setBusy(true);
    const res = await fetch("/api/question-bank", {
      method: f.id ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(f),
    });
    setBusy(false);
    const j = await res.json().catch(() => ({}));
    if (!res.ok) { setError(j.error || "Could not save that question."); return; }
    push(f.id ? "Question updated." : "Question saved to the bank.", "success");
    setShowForm(false);
    setF({ ...BLANK });
    // A brand-new question comes back in `rows`; show it right away. Edits refetch.
    if (!f.id && Array.isArray(j.rows) && j.rows.length) {
      setSubject(""); setLevel(""); setSearch("");
      setRows((prev) => [...(j.rows as BankRow[]), ...prev]);
      router.refresh();
    } else {
      reload();
    }
  }

  async function remove(r: BankRow) {
    setConfirmDelete(null);
    const res = await fetch(`/api/question-bank?id=${encodeURIComponent(r.id)}`, { method: "DELETE" });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) { push(j.error || "Could not delete that question.", "error"); return; }
    setRows((rs) => rs.filter((x) => x.id !== r.id));
    push("Question removed.", "success");
  }

  function setOption(i: number, value: string) {
    setF((p) => ({ ...p, options: p.options.map((o, j) => (j === i ? value : o)) }));
  }

  return (
    <div className="space-y-6">
      {confirmDelete && (
        <ConfirmModal
          title="Remove this question?"
          message="Tests already built from it keep their own copy — only the bank entry goes."
          confirmLabel="Remove" danger
          onConfirm={() => remove(confirmDelete)}
          onCancel={() => setConfirmDelete(null)}
        />
      )}

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold">Question bank</h1>
          <p className="text-sm text-ink/50">
            Write a question once and reuse it in any CBT test, this term or next.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => { setGenOpen((s) => !s); setGenErr(""); }}
            className="btn inline-flex items-center gap-2 border border-gold/50 bg-white text-gold-deep hover:bg-gold-pale">
            <Icon name="sparkles" className="h-4 w-4" /> {genOpen ? "Close A.I" : "Generate with A.I"}
          </button>
          <button onClick={() => { setF({ ...BLANK }); setError(""); setShowForm((s) => !s); }}
            className="btn-gold inline-flex items-center gap-2">
            <Icon name="plusSquare" className="h-4 w-4" /> {showForm ? "Close" : "Add a question"}
          </button>
        </div>
      </div>

      {/* ── A.I generator ─────────────────────────────────────────── */}
      {genOpen && (
        <div className="card space-y-4 border-gold/30 p-6">
          <div className="flex items-center gap-2">
            <Icon name="sparkles" className="h-5 w-5 text-gold-deep" />
            <h2 className="font-display text-lg font-semibold">Generate questions with A.I</h2>
          </div>
          <p className="text-sm text-ink/55">The A.I drafts multiple-choice questions — review, drop any you don&apos;t want, then save them all to the bank.</p>
          <div className="grid gap-3 sm:grid-cols-4">
            <div>
              <label htmlFor="gen-subject" className="flabel">Subject</label>
              <select id="gen-subject" className="field" value={gen.subject} onChange={(e) => setGen({ ...gen, subject: e.target.value })}>
                {SUBJECTS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="gen-level" className="flabel">Level</label>
              <select id="gen-level" className="field" value={gen.level} onChange={(e) => setGen({ ...gen, level: e.target.value })}>
                {LEVELS.map((l) => <option key={l || "any"} value={l}>{l || "Any level"}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="gen-topic" className="flabel">Topic <span className="font-normal text-ink/40">(optional)</span></label>
              <input id="gen-topic" className="field" value={gen.topic} onChange={(e) => setGen({ ...gen, topic: e.target.value })} placeholder="e.g. Quadratic equations" />
            </div>
            <div>
              <label htmlFor="gen-count" className="flabel">How many</label>
              <select id="gen-count" className="field" value={gen.count} onChange={(e) => setGen({ ...gen, count: Number(e.target.value) })}>
                {[3, 5, 8, 10].map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
          </div>
          {genErr && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">{genErr}</p>}
          <button onClick={generate} disabled={genBusy} className="btn-gold inline-flex items-center gap-2">
            <Icon name="sparkles" className="h-4 w-4" /> {genBusy ? "Generating…" : "Generate"}
          </button>

          {generated.length > 0 && (
            <div className="space-y-3 border-t border-line pt-4">
              <p className="text-sm font-bold text-ink/70">{generated.length} draft{generated.length === 1 ? "" : "s"} — review before saving</p>
              {generated.map((q, i) => (
                <div key={i} className="rounded-xl border border-line bg-chalk/40 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-semibold text-ink">{i + 1}. {q.question}</p>
                    <button onClick={() => dropGenerated(i)} aria-label="Drop this question"
                      className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-ink/40 hover:bg-red-50 hover:text-red-600"><Icon name="close" className="h-4 w-4" /></button>
                  </div>
                  <ul className="mt-1.5 space-y-0.5">
                    {q.options.map((o, j) => (
                      <li key={j} className={`text-[13px] ${j === q.answer ? "font-bold text-emerald-700" : "text-ink/55"}`}>{j === q.answer ? "✓ " : "· "}{o}</li>
                    ))}
                  </ul>
                </div>
              ))}
              <div className="flex flex-wrap gap-2">
                <button onClick={saveGenerated} disabled={genBusy} className="btn-gold">{genBusy ? "Saving…" : `Save all ${generated.length} to bank`}</button>
                <button onClick={() => setGenerated([])} className="btn-ghost">Discard</button>
              </div>
            </div>
          )}
        </div>
      )}

      {needsMigration && (
        <p role="alert" className="rounded-xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">
          Run <code>supabase/migration-question-bank.sql</code> in Supabase to start using the bank.
        </p>
      )}

      {showForm && (
        <div className="card space-y-4 p-6">
          <h2 className="font-display text-lg font-semibold">{f.id ? "Edit question" : "New question"}</h2>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label htmlFor="qb-subject" className="flabel">Subject</label>
              <select id="qb-subject" className="field" value={f.subject}
                onChange={(e) => setF({ ...f, subject: e.target.value })}>
                {SUBJECTS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="qb-level" className="flabel">Level</label>
              <select id="qb-level" className="field" value={f.level}
                onChange={(e) => setF({ ...f, level: e.target.value })}>
                {LEVELS.map((l) => <option key={l || "any"} value={l}>{l || "Any level"}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="qb-topic" className="flabel">Topic <span className="font-normal text-ink/40">(optional)</span></label>
              <input id="qb-topic" className="field" list="qb-topics" value={f.topic}
                onChange={(e) => setF({ ...f, topic: e.target.value })} placeholder="e.g. Quadratic equations" />
              <datalist id="qb-topics">{topics.map((t) => <option key={t} value={t} />)}</datalist>
            </div>
          </div>

          <div>
            <label htmlFor="qb-question" className="flabel">Question</label>
            <textarea id="qb-question" className="field min-h-[80px]" value={f.question}
              onChange={(e) => setF({ ...f, question: e.target.value })}
              placeholder="What is the value of x in 2x + 6 = 14?" />
          </div>

          <div>
            <label htmlFor="qb-code" className="flabel">Code snippet <span className="font-normal text-ink/40">(optional)</span></label>
            <textarea id="qb-code" className="field min-h-[64px] font-mono text-[13px]" value={f.code}
              onChange={(e) => setF({ ...f, code: e.target.value })}
              placeholder="Shown above the options, for coding questions" />
          </div>

          <div>
            <p className="flabel">Options <span className="font-normal text-ink/40">— tick the correct one</span></p>
            <div className="space-y-2">
              {f.options.map((o, i) => (
                <div key={i} className="flex items-center gap-2">
                  <button type="button" onClick={() => setF({ ...f, answer: i })}
                    aria-label={`Mark option ${i + 1} as the correct answer`}
                    aria-pressed={f.answer === i}
                    className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl border transition ${
                      f.answer === i
                        ? "border-emerald-500 bg-emerald-50 text-emerald-600"
                        : "border-line text-ink/30 hover:border-gold/50"}`}>
                    <Icon name="checkCircle" className="h-5 w-5" />
                  </button>
                  <input className="field" value={o} onChange={(e) => setOption(i, e.target.value)}
                    aria-label={`Option ${i + 1}`} placeholder={`Option ${i + 1}`} />
                  {f.options.length > 2 && (
                    <button type="button" aria-label={`Remove option ${i + 1}`}
                      onClick={() => setF((p) => ({
                        ...p,
                        options: p.options.filter((_, j) => j !== i),
                        answer: p.answer >= i && p.answer > 0 ? p.answer - 1 : p.answer,
                      }))}
                      className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl text-ink/35 hover:text-red-600">
                      <Icon name="close" className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            {f.options.length < MAX_OPTIONS && (
              <button type="button" onClick={() => setF((p) => ({ ...p, options: [...p.options, ""] }))}
                className="mt-2 text-sm font-bold text-gold-deep hover:underline">+ Add an option</button>
            )}
          </div>

          {error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">{error}</p>}

          <div className="flex flex-wrap gap-2">
            <button onClick={save} disabled={busy} className="btn-gold">
              {busy ? "Saving…" : f.id ? "Save changes" : "Save to bank"}
            </button>
            <button onClick={() => { setShowForm(false); setF({ ...BLANK }); }} className="btn-ghost">Cancel</button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label htmlFor="qb-filter-subject" className="flabel">Subject</label>
          <select id="qb-filter-subject" className="field !w-auto" value={subject} onChange={(e) => setSubject(e.target.value)}>
            <option value="">All subjects</option>
            {SUBJECTS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="qb-filter-level" className="flabel">Level</label>
          <select id="qb-filter-level" className="field !w-auto" value={level} onChange={(e) => setLevel(e.target.value)}>
            <option value="">All levels</option>
            {LEVELS.filter(Boolean).map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>
        <div className="min-w-[200px] flex-1">
          <label htmlFor="qb-search" className="flabel">Search</label>
          <input id="qb-search" className="field" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Question text or topic…" />
        </div>
        <span className="pb-2.5 text-sm font-bold text-ink/50">
          {visible.length} of {rows.length}
        </span>
      </div>

      {visible.length === 0 ? (
        <EmptyState icon="assignments" title="No questions yet"
          body="Add one above, or save the questions from a CBT test you're building — they'll appear here for next time." />
      ) : (
        <div className="space-y-3">
          {visible.map((r) => (
            <article key={r.id} className="card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="pill-gold">{r.subject || "General"}</span>
                    {r.level && <span className="pill-blue">{r.level}</span>}
                    {r.topic && <span className="pill bg-chalk text-ink/60">{r.topic}</span>}
                  </div>
                  <p className="mt-2 whitespace-pre-wrap font-semibold text-ink">{r.question}</p>
                  {r.code && (
                    <pre className="mt-2 overflow-x-auto rounded-xl bg-[#0b2036] p-3 font-mono text-[12px] text-slate-100">{r.code}</pre>
                  )}
                  <ul className="mt-2 space-y-1">
                    {(r.options ?? []).map((o, i) => (
                      <li key={i} className={`text-[13px] ${i === r.answer ? "font-bold text-emerald-700" : "text-ink/55"}`}>
                        {i === r.answer ? "✓ " : "· "}{o}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="flex flex-shrink-0 gap-1">
                  <button onClick={() => edit(r)} aria-label="Edit this question"
                    className="flex h-11 w-11 items-center justify-center rounded-xl text-ink/45 hover:bg-chalk hover:text-ink">
                    <Icon name="book" className="h-4 w-4" />
                  </button>
                  <button onClick={() => setConfirmDelete(r)} aria-label="Remove this question"
                    className="flex h-11 w-11 items-center justify-center rounded-xl text-ink/45 hover:bg-red-50 hover:text-red-600">
                    <Icon name="close" className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
