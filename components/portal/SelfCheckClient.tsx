"use client";
import { useState } from "react";
import { Icon } from "@/components/Icons";

type Result = { mark: number | null; feedback: string };

// "Check my work" — a learner types a question and their working and the A.I
// marks it out of 10 with feedback. A photo can be snapped to read alongside
// while typing it up (kept in the browser only — the marker reads the text).
export default function SelfCheckClient() {
  const [question, setQuestion] = useState("");
  const [work, setWork] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [result, setResult] = useState<Result | null>(null);

  function attach(file?: File) {
    if (!file) return;
    if (photo) URL.revokeObjectURL(photo);
    setPhoto(URL.createObjectURL(file));
  }

  async function check() {
    if (!question.trim() || !work.trim()) { setErr("Add the question and your working first."); return; }
    setBusy(true); setErr(""); setResult(null);
    try {
      const res = await fetch("/api/ai/self-check", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, work }),
      });
      const j = await res.json();
      if (!res.ok) { setErr(j.error || "Couldn't check that — try again."); return; }
      setResult({ mark: j.mark ?? null, feedback: j.feedback ?? "" });
    } catch { setErr("Couldn't reach the marker — try again."); }
    finally { setBusy(false); }
  }

  const markColor = (m: number) => m >= 8 ? "#059669" : m >= 5 ? "#C8881F" : "#EF4444";

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div className="card space-y-4 p-6">
        <div>
          <label htmlFor="sc-q" className="flabel">The question</label>
          <textarea id="sc-q" className="field min-h-[70px]" value={question} onChange={(e) => setQuestion(e.target.value)}
            placeholder="Type or paste the question you're solving." />
        </div>

        <div>
          <span className="flabel">Snap your working <span className="font-normal text-ink/40">(optional — to read while you type it up)</span></span>
          {photo ? (
            <div className="flex items-start gap-3">
              <img src={photo} alt="Your working" className="max-h-56 rounded-xl border border-line" />
              <button onClick={() => { URL.revokeObjectURL(photo); setPhoto(null); }} className="text-sm font-bold text-red-500 hover:underline">Remove</button>
            </div>
          ) : (
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-line px-4 py-2.5 text-sm font-bold text-ink/60 hover:bg-chalk">
              <Icon name="materials" className="h-4 w-4" /> Add a photo
              <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => attach(e.target.files?.[0])} />
            </label>
          )}
        </div>

        <div>
          <label htmlFor="sc-w" className="flabel">Your working &amp; answer</label>
          <textarea id="sc-w" className="field min-h-[130px]" value={work} onChange={(e) => setWork(e.target.value)}
            placeholder="Write out your steps and final answer here — the A.I marks what you type." />
        </div>

        {err && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">{err}</p>}

        <button onClick={check} disabled={busy} className="btn-gold inline-flex items-center gap-2">
          <Icon name="sparkles" className="h-4 w-4" /> {busy ? "Marking…" : "Check my work"}
        </button>
      </div>

      {result && (
        <div className="card p-6">
          {result.mark !== null && (
            <div className="mb-3 flex items-center gap-3">
              <span className="font-display text-4xl font-extrabold" style={{ color: markColor(result.mark) }}>{result.mark}<span className="text-xl text-ink/30">/10</span></span>
              <span className="text-sm font-bold text-ink/50">A.I mark — a guide, not your official grade</span>
            </div>
          )}
          <p className="whitespace-pre-line text-sm leading-relaxed text-ink/80">{result.feedback}</p>
        </div>
      )}
    </div>
  );
}
