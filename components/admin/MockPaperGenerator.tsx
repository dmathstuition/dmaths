"use client";
import { useState } from "react";
import { Icon } from "@/components/Icons";
import { useToast } from "@/components/Toast";
import { EXAM_STANDARDS, MOCK_SUBJECTS, standardByKey, MOCK_PAPER_MAX, MOCK_PAPER_MIN } from "@/lib/mockPaper";

const LEVELS = ["", "SS 3", "SS 2", "SS 1", "JSS 3", "JSS 2", "JSS 1"];

type Draft = { question: string; code?: string; topic?: string; options: string[]; answer: number };
type Result = { questions: Draft[]; exam: string; subject: string; level: string; groupName: string };

// Admin: generate a WAEC/JAMB-standard mock paper with the A.I, review it, then
// save it into the question bank (exam-tagged + grouped) where mocks draw from.
export default function MockPaperGenerator() {
  const push = useToast();
  const [exam, setExam] = useState<"WAEC" | "JAMB">("WAEC");
  const [subject, setSubject] = useState("Mathematics");
  const [topic, setTopic] = useState("");
  const [level, setLevel] = useState("SS 3");
  const [count, setCount] = useState<number>(standardByKey("WAEC").defaultCount);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [result, setResult] = useState<Result | null>(null);

  function chooseExam(k: "WAEC" | "JAMB") {
    setExam(k);
    setCount(standardByKey(k).defaultCount);
  }

  async function generate() {
    setBusy(true); setErr(""); setResult(null);
    try {
      const res = await fetch("/api/ai/mock-paper", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ exam, subject, topic, level, count }),
      });
      const j = await res.json();
      if (!res.ok) { setErr(j.error || "Couldn't set the paper — try again."); return; }
      setResult({ questions: j.questions ?? [], exam: j.exam, subject: j.subject, level: j.level ?? "", groupName: j.groupName });
    } catch { setErr("Couldn't reach the A.I — try again."); }
    finally { setBusy(false); }
  }

  function dropQ(i: number) {
    setResult((r) => r ? { ...r, questions: r.questions.filter((_, j) => j !== i) } : r);
  }

  async function save() {
    if (!result?.questions.length) return;
    const n = result.questions.length;
    setBusy(true); setErr("");
    try {
      const res = await fetch("/api/question-bank", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questions: result.questions, subject: result.subject, level: result.level,
          exam: result.exam, group_name: result.groupName,
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) { const m = j.error || "Couldn't save the paper."; setErr(m); push(m, "error"); return; }
      push(`${n} ${result.exam} question${n === 1 ? "" : "s"} saved to “${result.groupName}”.`, "success");
      setResult(null);
    } finally { setBusy(false); }
  }

  const std = standardByKey(exam);

  return (
    <div className="card space-y-4 border-gold/30 p-6">
      <div className="flex items-center gap-2">
        <Icon name="sparkles" className="h-5 w-5 text-gold-deep" />
        <h2 className="font-display text-lg font-semibold">Set a mock paper with A.I</h2>
      </div>
      <p className="text-sm text-ink/55">
        Draft an exam-standard paper, review it, then save it to the bank — mocks for that subject/exam draw from it automatically.
      </p>

      {/* Exam standard */}
      <div className="flex flex-wrap gap-2">
        {EXAM_STANDARDS.map((s) => (
          <button key={s.key} onClick={() => chooseExam(s.key)}
            className={`rounded-xl border px-4 py-2 text-left transition ${exam === s.key ? "border-gold bg-gold-pale" : "border-line bg-white hover:border-gold/40"}`}>
            <p className={`text-sm font-bold ${exam === s.key ? "text-gold-deep" : "text-ink"}`}>{s.label}</p>
            <p className="text-[11px] text-ink/50">{s.blurb}</p>
          </button>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <div>
          <label htmlFor="mp-subject" className="flabel">Subject</label>
          <select id="mp-subject" className="field" value={subject} onChange={(e) => setSubject(e.target.value)}>
            <option value="random">🎲 Random subject</option>
            {MOCK_SUBJECTS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="mp-topic" className="flabel">Topic <span className="font-normal text-ink/40">(optional)</span></label>
          <input id="mp-topic" className="field" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Blank = mixed paper" />
        </div>
        <div>
          <label htmlFor="mp-level" className="flabel">Candidates <span className="font-normal text-ink/40">(level)</span></label>
          <select id="mp-level" className="field" value={level} onChange={(e) => setLevel(e.target.value)}>
            {LEVELS.map((l) => <option key={l || "any"} value={l}>{l || "Any level"}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="mp-count" className="flabel">Questions</label>
          <input id="mp-count" type="number" min={MOCK_PAPER_MIN} max={MOCK_PAPER_MAX} className="field"
            value={count} onChange={(e) => setCount(Math.max(MOCK_PAPER_MIN, Math.min(MOCK_PAPER_MAX, Number(e.target.value) || std.defaultCount)))} />
        </div>
      </div>

      {err && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">{err}</p>}

      <button onClick={generate} disabled={busy} className="btn-gold inline-flex items-center gap-2">
        <Icon name="sparkles" className="h-4 w-4" /> {busy && !result ? "Setting the paper…" : `Set ${exam} paper`}
      </button>

      {result && (
        <div className="space-y-3 border-t border-line pt-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-bold text-ink/70">
              {result.questions.length} {result.exam} question{result.questions.length === 1 ? "" : "s"} · {result.subject}
              {result.level ? ` · ${result.level}` : ""} — review before saving
            </p>
            <span className="rounded-full bg-gold-pale px-3 py-1 text-[11px] font-bold text-gold-deep">Group: {result.groupName}</span>
          </div>

          {result.questions.map((q, i) => (
            <div key={i} className="rounded-xl border border-line bg-chalk/40 p-4">
              <div className="flex items-start justify-between gap-3">
                <p className="font-semibold text-ink">{i + 1}. {q.question}</p>
                <button onClick={() => dropQ(i)} aria-label="Drop this question"
                  className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-ink/40 hover:bg-red-50 hover:text-red-600"><Icon name="close" className="h-4 w-4" /></button>
              </div>
              {q.topic && <p className="mt-1 text-[11px] font-bold uppercase tracking-wide text-gold-deep">{q.topic}</p>}
              <ul className="mt-1.5 space-y-0.5">
                {q.options.map((o, j) => (
                  <li key={j} className={`text-[13px] ${j === q.answer ? "font-bold text-emerald-700" : "text-ink/55"}`}>{j === q.answer ? "✓ " : "· "}{o}</li>
                ))}
              </ul>
            </div>
          ))}

          <div className="flex flex-wrap gap-2">
            <button onClick={save} disabled={busy || !result.questions.length} className="btn-gold">{busy ? "Saving…" : `Save ${result.questions.length} to bank`}</button>
            <button onClick={() => setResult(null)} className="btn-ghost">Discard</button>
          </div>
        </div>
      )}
    </div>
  );
}
