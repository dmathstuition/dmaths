"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/Icons";
import { useToast } from "@/components/Toast";

type Learner = { id: string; name: string };

const BLANK = {
  classId: "", subject: "", date: "", time: "", durationMinutes: 60,
  mode: "online" as "online" | "physical", platform: "Zoom", location: "", link: "",
  repeatWeekly: false, repeatWeeks: 8, studentIds: [] as string[],
};

// Lets a tutor schedule their own classes. The API pins the class to them and
// only accepts learners from their roster, so this form can stay simple.
export default function TutorClassForm({ roster, editing, onDone }: {
  roster: Learner[];
  editing?: any | null;
  onDone?: () => void;
}) {
  const router = useRouter();
  const push = useToast();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ ...BLANK });
  const [busy, setBusy] = useState(false);

  function start(existing?: any) {
    if (existing) {
      const d = new Date(existing.starts_at);
      const pad = (n: number) => String(n).padStart(2, "0");
      setF({
        ...BLANK,
        classId: existing.id,
        subject: existing.subject ?? "",
        date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
        time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
        durationMinutes: existing.duration_minutes ?? 60,
        mode: existing.mode === "physical" ? "physical" : "online",
        platform: existing.platform ?? "Zoom",
        location: existing.location ?? "",
        link: existing.link ?? "",
        studentIds: (existing.class_students ?? []).map((r: any) => r.student_id),
      });
    } else {
      setF({ ...BLANK });
    }
    setOpen(true);
  }

  function toggleLearner(id: string) {
    setF((p) => ({
      ...p,
      studentIds: p.studentIds.includes(id) ? p.studentIds.filter((x) => x !== id) : [...p.studentIds, id],
    }));
  }

  async function save() {
    if (!f.subject.trim()) { push("Enter a subject.", "error"); return; }
    if (!f.date || !f.time) { push("Pick a date and time.", "error"); return; }
    setBusy(true);
    const res = await fetch("/api/classes/manage", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...f, startsAt: new Date(`${f.date}T${f.time}`).toISOString() }),
    });
    setBusy(false);
    const j = await res.json().catch(() => ({}));
    if (!res.ok) { push(j.error || "Could not save the class.", "error"); return; }
    push(f.classId ? "Class updated." : j.created > 1 ? `${j.created} weekly classes scheduled.` : "Class scheduled.", "success");
    setOpen(false);
    setF({ ...BLANK });
    onDone?.();
    router.refresh();
  }

  if (!open) {
    return (
      <button onClick={() => start(editing)} className="btn-gold inline-flex items-center gap-2">
        <Icon name="plusSquare" className="h-4 w-4" /> Schedule a class
      </button>
    );
  }

  return (
    <div className="card p-6">
      <h2 className="mb-4 font-display text-lg font-semibold">{f.classId ? "Edit class" : "Schedule a class"}</h2>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="tutorc-subject" className="flabel">Subject</label>
          <input id="tutorc-subject" className="field" value={f.subject} onChange={(e) => setF({ ...f, subject: e.target.value })} placeholder="e.g. Further Maths" />
        </div>
        <div>
          <label htmlFor="tutorc-duration-minutes" className="flabel">Duration (minutes)</label>
          <input id="tutorc-duration-minutes" type="number" min={15} max={300} step={15} className="field"
            value={f.durationMinutes} onChange={(e) => setF({ ...f, durationMinutes: Number(e.target.value) })} />
        </div>
        <div>
          <label htmlFor="tutorc-date" className="flabel">Date</label>
          <input id="tutorc-date" type="date" className="field" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} />
        </div>
        <div>
          <label htmlFor="tutorc-start-time" className="flabel">Start time</label>
          <input id="tutorc-start-time" type="time" className="field" value={f.time} onChange={(e) => setF({ ...f, time: e.target.value })} />
        </div>
      </div>

      <p className="flabel mt-4 block">Where</p>
      <div className="flex flex-wrap gap-2">
        {([["online", "Online"], ["physical", "In-person"]] as const).map(([m, label]) => (
          <button key={m} type="button" onClick={() => setF({ ...f, mode: m })}
            className={`rounded-xl border px-4 py-2 text-sm font-semibold transition ${
              f.mode === m ? "border-gold bg-gold-pale text-gold-deep" : "border-line bg-white text-ink/60 hover:bg-chalk"}`}>
            {label}
          </button>
        ))}
      </div>

      {f.mode === "online" ? (
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="tutorc-platform" className="flabel">Platform</label>
            <input id="tutorc-platform" className="field" value={f.platform} onChange={(e) => setF({ ...f, platform: e.target.value })} placeholder="Zoom" />
          </div>
          <div>
            <label htmlFor="tutorc-join-link-optional" className="flabel">Join link <span className="text-ink/40">(optional)</span></label>
            <input id="tutorc-join-link-optional" className="field" value={f.link} onChange={(e) => setF({ ...f, link: e.target.value })} placeholder="https://…" />
          </div>
        </div>
      ) : (
        <div className="mt-3">
          <label htmlFor="tutorc-venue" className="flabel">Venue</label>
          <input id="tutorc-venue" className="field" value={f.location} onChange={(e) => setF({ ...f, location: e.target.value })} placeholder="Infant Jesus Academy, Old Anwai Road, Asaba" />
        </div>
      )}

      {!f.classId && (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm font-semibold text-ink/70">
            <input type="checkbox" checked={f.repeatWeekly} onChange={(e) => setF({ ...f, repeatWeekly: e.target.checked })} />
            Repeat weekly
          </label>
          {f.repeatWeekly && (
            <input type="number" min={2} max={26} className="field !mt-0 w-24"
              value={f.repeatWeeks} onChange={(e) => setF({ ...f, repeatWeeks: Number(e.target.value) })} />
          )}
          {f.repeatWeekly && <span className="text-[13px] text-ink/45">weeks, same day &amp; time</span>}
        </div>
      )}

      <p className="flabel mt-5 block">Learners <span className="text-ink/40">({f.studentIds.length} selected)</span></p>
      {roster.length ? (
        <div className="max-h-52 space-y-1 overflow-y-auto rounded-xl border border-line p-3">
          {roster.map((s) => (
            <label key={s.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-chalk/60">
              <input type="checkbox" checked={f.studentIds.includes(s.id)} onChange={() => toggleLearner(s.id)} />
              {s.name}
            </label>
          ))}
        </div>
      ) : (
        <p className="rounded-xl bg-chalk px-4 py-3 text-[13px] text-ink/55">
          No learners assigned to you yet — ask your admin to add some, then they'll appear here.
        </p>
      )}

      <div className="mt-5 flex flex-wrap gap-2">
        <button onClick={save} disabled={busy} className="btn-gold">{busy ? "Saving…" : f.classId ? "Save changes" : "Schedule"}</button>
        <button onClick={() => { setOpen(false); onDone?.(); }} className="btn-ghost">Cancel</button>
      </div>
    </div>
  );
}
