"use client";
import Link from "next/link";
import { useState } from "react";
import { useToast } from "@/components/Toast";
import { Icon } from "@/components/Icons";
import { fmtWATDate, fmtWATTime, utcToWatParts } from "@/lib/time";

export default function TutorClassesClient({ initialClasses }: { initialClasses: any[] }) {
  const push = useToast();
  const [classes, setClasses] = useState<any[]>(initialClasses);
  const [attendanceFor, setAttendanceFor] = useState<any>(null);
  const [present, setPresent] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);
  const [recFor, setRecFor] = useState<string | null>(null);
  const [recUrl, setRecUrl] = useState("");

  const now = Date.now();
  const upcoming = classes.filter((c) => new Date(c.starts_at).getTime() >= now - 2 * 60 * 60 * 1000);
  const past = classes
    .filter((c) => new Date(c.starts_at).getTime() < now - 2 * 60 * 60 * 1000)
    .sort((a, b) => new Date(b.starts_at).getTime() - new Date(a.starts_at).getTime());

  function openAttendance(c: any) {
    const roster = (c.class_students ?? []).map((r: any) => ({
      id: r.student_id,
      name: `${r.student?.first_name ?? ""} ${r.student?.last_name ?? ""}`.trim() || "Learner",
    }));
    if (!roster.length) { push("No learners on this class roster.", "error"); return; }
    const init: Record<string, boolean> = {};
    roster.forEach((s: any) => { init[s.id] = true; });
    setPresent(init);
    setAttendanceFor({ ...c, roster });
  }

  async function saveAttendance() {
    setBusy(true);
    const sessionDate = utcToWatParts(attendanceFor.starts_at).date; // yyyy-mm-dd (WAT)
    let ok = true;
    for (const s of attendanceFor.roster) {
      const res = await fetch("/api/attendance/mark", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ classId: attendanceFor.id, studentId: s.id, sessionDate, present: present[s.id] ?? false }),
      });
      if (!res.ok) ok = false;
    }
    setBusy(false);
    setAttendanceFor(null);
    push(ok ? "Attendance saved." : "Some entries could not be saved.", ok ? "success" : "error");
  }

  async function saveRecording(classId: string) {
    setBusy(true);
    const res = await fetch("/api/classes/recording", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ classId, url: recUrl.trim() }),
    });
    setBusy(false);
    if (!res.ok) { const j = await res.json().catch(() => ({})); push(j.error || "Could not save recording.", "error"); return; }
    setClasses((prev) => prev.map((c) => (c.id === classId ? { ...c, recording_url: recUrl.trim() } : c)));
    setRecFor(null); setRecUrl("");
    push(recUrl.trim() ? "Recording saved — the class has been notified. 🎥" : "Recording removed.", "success");
  }

  return (
    <div className="space-y-6 py-2">
      <div>
        <h1 className="font-display text-2xl font-bold">My Classes</h1>
        <p className="text-sm text-ink/50">Join your classes, take attendance, and share recordings.</p>
      </div>

      {classes.length === 0 && (
        <div className="card p-8 text-center text-sm text-ink/45">No classes assigned to you yet.</div>
      )}

      {upcoming.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wide text-ink/40">Upcoming</h2>
          {upcoming.map((c) => {
            const roster = c.class_students?.length ?? 0;
            return (
              <div key={c.id} className="card flex flex-wrap items-center justify-between gap-4 p-5">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="pill-blue">{c.subject}</span>
                    <span className="text-xs font-semibold text-ink/45">{c.platform}</span>
                  </div>
                  <p className="mt-1.5 font-display text-lg font-bold">{fmtWATDate(c.starts_at)} · {fmtWATTime(c.starts_at)}</p>
                  <p className="text-xs text-ink/45">{c.duration_minutes} min · {roster} learner{roster === 1 ? "" : "s"}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button className="btn-ghost !min-h-[42px]" onClick={() => openAttendance(c)}>Take attendance</button>
                  <Link href={`/tutor/class/${c.id}/live`} className="btn-ink inline-flex items-center gap-1.5 !min-h-[42px] !px-5"><Icon name="radio" className="h-4 w-4" /> Start live</Link>
                  {c.link && <a href={c.link} target="_blank" rel="noopener noreferrer" className="btn-gold !min-h-[42px] !px-6">Join →</a>}
                </div>
              </div>
            );
          })}
        </section>
      )}

      {past.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wide text-ink/40">Past</h2>
          {past.slice(0, 12).map((c) => (
            <div key={c.id} className="card p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold">{c.subject} <span className="font-normal text-ink/45">· {fmtWATDate(c.starts_at)}</span></p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {c.recording_url && (
                    <a href={c.recording_url} target="_blank" rel="noopener noreferrer"
                      className="btn-ghost !min-h-[36px] !px-3 !text-sm text-gold-deep">▶ Recording</a>
                  )}
                  <button className="btn-ghost !min-h-[36px] !px-3 !text-sm"
                    onClick={() => { setRecFor(recFor === c.id ? null : c.id); setRecUrl(c.recording_url || ""); }}>
                    {c.recording_url ? "Edit recording" : "🎥 Add recording"}
                  </button>
                  <button className="btn-ghost !min-h-[36px] !px-3 !text-sm" onClick={() => openAttendance(c)}>Attendance</button>
                </div>
              </div>
              {recFor === c.id && (
                <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line pt-3">
                  <input className="field min-w-0 flex-1" placeholder="Recording link (https://…)"
                    value={recUrl} onChange={(e) => setRecUrl(e.target.value)} />
                  <button className="btn-gold !min-h-[40px] !px-4 !text-sm" disabled={busy} onClick={() => saveRecording(c.id)}>Save & notify</button>
                </div>
              )}
            </div>
          ))}
        </section>
      )}

      {attendanceFor && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 backdrop-blur-sm sm:items-center sm:p-4">
          <div className="w-full max-w-lg rounded-t-2xl bg-white sm:rounded-2xl">
            <div className="border-b border-line px-6 py-4">
              <h2 className="font-display text-lg font-semibold">Attendance — {attendanceFor.subject}</h2>
              <p className="text-xs text-ink/45">{fmtWATDate(attendanceFor.starts_at)}. Tap to toggle present / absent.</p>
            </div>
            <div className="max-h-[50vh] space-y-1.5 overflow-y-auto p-4">
              {attendanceFor.roster.map((s: any) => {
                const isPresent = present[s.id] ?? false;
                return (
                  <button key={s.id} onClick={() => setPresent((p) => ({ ...p, [s.id]: !p[s.id] }))}
                    className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition ${isPresent ? "border-emerald-300 bg-emerald-50" : "border-red-200 bg-red-50"}`}>
                    <span className="font-semibold">{s.name}</span>
                    <span className={`pill ${isPresent ? "pill-green" : "pill-red"}`}>{isPresent ? "Present" : "Absent"}</span>
                  </button>
                );
              })}
            </div>
            <div className="flex gap-3 border-t border-line p-4">
              <button className="btn-ghost flex-1" onClick={() => setAttendanceFor(null)}>Cancel</button>
              <button className="btn-gold flex-1" onClick={saveAttendance} disabled={busy}>{busy ? "Saving…" : "Save attendance"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
