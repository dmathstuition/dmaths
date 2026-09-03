"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/Icons";
import { useToast } from "@/components/Toast";
import { segmentsOf } from "@/lib/aptitude";

type SafeQuestion = { question: string; options: string[]; segment?: string };
type Test = {
  id: string;
  status: string;
  scheduled_at: string | null;
  score: number | null;
  total: number | null;
  report: string | null;
  questions: SafeQuestion[];
};

export default function AptitudeClient({ test }: { test: Test | null }) {
  const router = useRouter();
  const push = useToast();
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ score: number; total: number; percent: number; band: string } | null>(null);

  const Hero = (
    <div className="boardgrid relative flex items-center gap-4 overflow-hidden rounded-2xl bg-board p-7 text-white">
      <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-gold/15 text-gold ring-1 ring-gold/25">
        <Icon name="graduationCap" className="h-6 w-6" />
      </span>
      <div>
        <h1 className="font-display text-2xl font-semibold sm:text-3xl">Aptitude test</h1>
        <p className="mt-1 text-sm text-white/50">A short diagnostic so we can teach you at just the right level.</p>
      </div>
    </div>
  );

  function card(icon: any, title: string, body: string) {
    return (
      <div className="card neu-card p-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gold-pale text-gold-deep"><Icon name={icon} className="h-7 w-7" /></div>
        <h2 className="font-display text-lg font-semibold text-ink">{title}</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-ink/55">{body}</p>
      </div>
    );
  }

  const fmt = (s: string) => new Date(s).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" });
  const now = Date.now();
  const open = test && test.status === "scheduled" && test.scheduled_at && new Date(test.scheduled_at).getTime() <= now;

  async function submit() {
    if (!test) return;
    if (Object.keys(answers).length < test.questions.length) { push("Answer every question first.", "error"); return; }
    setBusy(true);
    const res = await fetch("/api/aptitude/submit", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ testId: test.id, answers }),
    });
    const j = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { push(j.error || "Could not submit — try again.", "error"); return; }
    setResult({ score: j.score, total: j.total, percent: j.percent, band: j.band });
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {Hero}

      {result ? (
        card("checkCircle", "All done — well done!",
          `You scored ${result.score}/${result.total}. Your tutor will review it and your parent will get a full report shortly.`)
      ) : !test ? (
        card("clock", "No aptitude test yet", "When one is assigned, it'll appear here. We'll let you know.")
      ) : test.status === "reported" && test.report ? (
        <div className="card neu-card p-6">
          <h2 className="font-display text-lg font-semibold text-ink">Your aptitude report</h2>
          {test.score != null && test.total != null && (
            <p className="mt-1 text-sm font-bold text-gold-deep">Score: {test.score}/{test.total}</p>
          )}
          <p className="mt-3 whitespace-pre-wrap text-[15px] leading-relaxed text-ink/75">{test.report}</p>
        </div>
      ) : ["submitted", "analyzed", "reported"].includes(test.status) ? (
        card("clock", "Submitted — thank you!", "Your tutor is preparing your report. Your parent will receive it soon.")
      ) : test.status === "scheduled" && !test.scheduled_at ? (
        card("calendar", "Waiting to be scheduled", "An adult will pick a time for your test from the parent portal. It'll open here at that time.")
      ) : test.status === "scheduled" && test.scheduled_at && !open ? (
        card("calendar", "Test scheduled", `Your aptitude test opens on ${fmt(test.scheduled_at)}. Come back then — good luck!`)
      ) : open ? (
        <div className="space-y-5">
          <p className="rounded-xl border border-gold/40 bg-gold-pale/50 px-4 py-3 text-sm font-semibold text-ink/70">
            Answer all {test.questions.length} questions across the sections below, then submit. Take your time — this just helps us pitch your lessons.
          </p>
          {segmentsOf(test.questions as any).map((seg) => (
            <div key={seg.segment} className="space-y-3">
              {seg.segment !== "General" && (
                <div className="flex items-center gap-2 pt-1">
                  <span className="rounded-full bg-board px-3 py-1 text-[12px] font-extrabold uppercase tracking-wide text-white">{seg.segment}</span>
                  <span className="text-xs text-ink/40">{seg.items.length} question{seg.items.length === 1 ? "" : "s"}</span>
                </div>
              )}
              {seg.items.map(({ q, index }) => (
                <div key={index} className="card p-5">
                  <p className="font-semibold text-ink">{index + 1}. {(q as SafeQuestion).question}</p>
                  <div className="mt-3 space-y-2">
                    {(q as SafeQuestion).options.map((o, j) => {
                      const on = answers[index] === j;
                      return (
                        <button key={j} type="button" onClick={() => setAnswers(a => ({ ...a, [index]: j }))}
                          className={`flex w-full items-center gap-3 rounded-xl border px-4 py-2.5 text-left text-sm transition
                            ${on ? "border-gold bg-gold-pale font-semibold text-gold-deep" : "border-line bg-white text-ink/70 hover:border-gold/40"}`}>
                          <span className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border text-[11px] font-bold ${on ? "border-gold bg-gold text-white" : "border-line text-ink/40"}`}>
                            {String.fromCharCode(65 + j)}
                          </span>
                          {o}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ))}
          <button onClick={submit} disabled={busy} className="btn-gold w-full">{busy ? "Submitting…" : "Submit aptitude test"}</button>
        </div>
      ) : (
        card("clock", "Nothing to do right now", "Check back later.")
      )}
    </div>
  );
}
