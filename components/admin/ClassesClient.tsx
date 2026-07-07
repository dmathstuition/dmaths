"use client";
import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import ConfirmModal from "@/components/ConfirmModal";
import { useToast } from "@/components/Toast";
import { fmtWAT, watToUtcISO, utcToWatParts } from "@/lib/time";

type ConfirmState = {
  title: string; message: string; confirmLabel?: string; danger?: boolean; onConfirm: () => void;
};

export default function ClassesClient({ initialClasses, initialStudents }: { initialClasses: any[]; initialStudents: any[] }) {
  const supabase = supabaseBrowser();
  const push = useToast();
  const [classes, setClasses] = useState<any[]>(initialClasses);
  const [students] = useState<any[]>(initialStudents);
  const [showForm, setShowForm] = useState(false);
  const [f, setF] = useState<any>({ platform: "Zoom", duration_minutes: 60, roster: [] as string[] });
  const [editId, setEditId] = useState<string | null>(null);
  const [attendanceFor, setAttendanceFor] = useState<any>(null);
  const [present, setPresent] = useState<Record<string, boolean>>({});
  const [joined, setJoined] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState("");
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);

  async function reload() {
    const { data: c } = await supabase.from("classes").select("*, class_students(student_id)").order("starts_at", { ascending: true });
    setClasses(c ?? []);
  }

  async function createClass() {
    if (!(f.subject && f.tutor && f.date && f.time)) return setFormError("Fill in subject, tutor, date and time.");
    setFormError("");
    setBusy(true);
    try {
      const starts_at = watToUtcISO(f.date, f.time); // interpret the typed time as WAT
      const payload = { subject: f.subject, tutor: f.tutor, platform: f.platform, starts_at,
        duration_minutes: Number(f.duration_minutes) || 60, link: f.link || "" };

      if (editId) {
        const { error } = await supabase.from("classes").update(payload).eq("id", editId);
        if (error) { setFormError("Could not update class."); return; }
        setEditId(null);
      } else {
        // Weekly recurring: generate one class per week (same time, +7 days each),
        // all sharing a series_id. WAT has no DST, so +168h keeps the same clock time.
        const weeks = f.repeat_weekly ? Math.max(2, Math.min(26, Number(f.repeat_weeks) || 8)) : 1;
        const seriesId = weeks > 1 ? crypto.randomUUID() : null;
        const baseMs = new Date(starts_at).getTime();
        const rows = Array.from({ length: weeks }, (_, i) => ({
          ...payload,
          starts_at: new Date(baseMs + i * 7 * 86_400_000).toISOString(),
          ...(seriesId ? { series_id: seriesId } : {}),
        }));
        const { data: created, error } = await supabase.from("classes").insert(rows).select();
        if (error || !created?.length) { setFormError("Could not create class."); return; }
        if (f.roster.length) {
          const links = created.flatMap((cls: any) =>
            f.roster.map((sid: string) => ({ class_id: cls.id, student_id: sid })));
          await supabase.from("class_students").insert(links);
        }
      }
      setShowForm(false); setF({ platform: "Zoom", duration_minutes: 60, roster: [] }); reload();
    } finally {
      setBusy(false);
    }
  }

  function startEditClass(c: any) {
    if (c.attendance_locked) { push("Locked classes cannot be edited.", "error"); return; }
    const { date, time } = utcToWatParts(c.starts_at); // show the stored time back as WAT
    setEditId(c.id);
    setF({
      subject: c.subject, tutor: c.tutor, platform: c.platform,
      date, time,
      duration_minutes: c.duration_minutes, link: c.link || "", roster: [],
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function openAttendance(cls: any) {
    const roster = students.filter(s => cls.class_students?.some((r: any) => r.student_id === s.id));
    if (!roster.length) { push("No students assigned to this class yet.", "error"); return; }
    const { data: existing } = await supabase.from("attendance_records")
      .select("student_id,present,self_marked,joined_at").eq("class_id", cls.id);
    const joinedMap: Record<string, boolean> = {};
    const init: Record<string, boolean> = {};
    roster.forEach(s => {
      const rec = (existing ?? []).find((e: any) => e.student_id === s.id);
      joinedMap[s.id] = !!rec?.self_marked;
      init[s.id] = rec ? !!rec.present : false;
    });
    setJoined(joinedMap);
    setPresent(init);
    setAttendanceFor({ ...cls, roster });
  }

  function triggerSaveAttendance() {
    setConfirmState({
      title: "Lock attendance?",
      message: "Once saved it is locked and cannot be changed.",
      confirmLabel: "Save & lock",
      onConfirm: doSaveAttendance,
    });
  }

  async function doSaveAttendance() {
    setConfirmState(null);
    setBusy(true);
    const rows = attendanceFor.roster.map((s: any) => ({
      class_id: attendanceFor.id, student_id: s.id, present: present[s.id] ?? false, self_marked: false,
    }));
    const { error: e1 } = await supabase.from("attendance_records")
      .upsert(rows, { onConflict: "class_id,student_id,session_date" });
    if (e1) { setBusy(false); push("Could not save attendance.", "error"); return; }
    await supabase.from("classes")
      .update({ attendance_locked: true, attendance_taken_at: new Date().toISOString() })
      .eq("id", attendanceFor.id);
    setBusy(false);
    setAttendanceFor(null);
    reload();
  }

  function deleteClass(c: any, series = false) {
    setConfirmState({
      title: series ? `Delete the whole weekly series?` : `Delete "${c.subject}"?`,
      message: series
        ? "Every session in this weekly series (past and upcoming) will be removed, along with their rosters and attendance. This cannot be undone."
        : c.attendance_locked
          ? "This class has locked attendance — deleting it also removes that attendance record. This cannot be undone."
          : "This also removes its roster and cannot be undone.",
      confirmLabel: series ? "Delete series" : "Delete",
      danger: true,
      onConfirm: async () => {
        setConfirmState(null);
        const res = await fetch("/api/classes/delete", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify(series ? { seriesId: c.series_id } : { classId: c.id }),
        });
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          push(j.error || "Could not delete class.", "error");
          return;
        }
        reload();
      },
    });
  }

  const CUTOFF = Date.now() - 86400000;
  const upcoming = classes.filter(c => new Date(c.starts_at).getTime() >= CUTOFF);
  const past = classes
    .filter(c => new Date(c.starts_at).getTime() < CUTOFF)
    .sort((a, b) => new Date(b.starts_at).getTime() - new Date(a.starts_at).getTime());

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold">Classes</h1>
          <p className="text-sm text-ink/45">{upcoming.length} upcoming</p>
        </div>
        <button className="btn-gold" onClick={() => { if (showForm) { setEditId(null); setF({ platform: "Zoom", duration_minutes: 60, roster: [] }); } setShowForm(v => !v); }}>{showForm ? "Cancel" : "+ Create class"}</button>
      </div>

      {showForm && (
        <div className="card space-y-4 p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <input className="field" placeholder="Subject" value={f.subject || ""} onChange={e => setF({ ...f, subject: e.target.value })} />
            <input className="field" placeholder="Tutor name" value={f.tutor || ""} onChange={e => setF({ ...f, tutor: e.target.value })} />
            <input className="field" type="date" value={f.date || ""} onChange={e => setF({ ...f, date: e.target.value })} />
            <input className="field" type="time" value={f.time || ""} onChange={e => setF({ ...f, time: e.target.value })} />
            <select className="field" value={f.platform} onChange={e => setF({ ...f, platform: e.target.value })}>
              <option>Zoom</option><option>Google Meet</option><option>Microsoft Teams</option>
            </select>
            <input className="field" type="number" min={15} step={15} placeholder="Duration (minutes)" value={f.duration_minutes} onChange={e => setF({ ...f, duration_minutes: e.target.value })} />
            <input className="field sm:col-span-2" placeholder="Class link (https://…)" value={f.link || ""} onChange={e => setF({ ...f, link: e.target.value })} />
          </div>

          {/* Weekly recurrence (new classes only) */}
          {!editId && (
            <div className="rounded-xl border border-line bg-chalk/40 p-4">
              <label className="flex items-center gap-3">
                <input type="checkbox" className="h-4 w-4 accent-gold"
                  checked={!!f.repeat_weekly} onChange={e => setF({ ...f, repeat_weekly: e.target.checked })} />
                <span className="text-sm font-bold text-ink">🔁 Repeat weekly</span>
              </label>
              {f.repeat_weekly && (
                <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-ink/70">
                  <span>Create it every week for</span>
                  <input type="number" min={2} max={26} className="field !w-20 !py-1.5"
                    value={f.repeat_weeks ?? 8} onChange={e => setF({ ...f, repeat_weeks: e.target.value })} />
                  <span>weeks (same day &amp; time).</span>
                </div>
              )}
            </div>
          )}

          {!editId && <div>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <p className="flabel mb-0">Assign students</p>
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => setF({ ...f, roster: students.map(s => s.id) })}
                  className="text-xs font-bold text-gold-deep hover:underline">Select all</button>
                <button type="button" onClick={() => setF({ ...f, roster: [] })}
                  className="text-xs font-bold text-ink/40 hover:underline">Clear</button>
              </div>
            </div>
            <div className="mb-2 flex flex-wrap gap-1.5">
              {[...new Set(students.map(s => s.level))].filter(Boolean).sort().map(level => (
                <button key={level} type="button"
                  onClick={() => setF({ ...f, roster: [...new Set([...f.roster, ...students.filter(s => s.level === level).map(s => s.id)])] })}
                  className="rounded-full border border-line px-2.5 py-0.5 text-[11px] font-bold text-ink/50 hover:bg-chalk">
                  + {level}
                </button>
              ))}
            </div>
            <div className="flex max-h-44 flex-wrap gap-2 overflow-y-auto">
              {students.map(s => {
                const on = f.roster.includes(s.id);
                return (
                  <button key={s.id} type="button"
                    onClick={() => setF({ ...f, roster: on ? f.roster.filter((x: string) => x !== s.id) : [...f.roster, s.id] })}
                    className={`rounded-full border px-3 py-1.5 text-[13px] font-semibold ${on ? "border-gold bg-gold-pale text-gold-deep" : "border-line bg-white text-ink/60"}`}>
                    {s.first_name} {s.last_name} · {s.level}
                  </button>
                );
              })}
            </div>
          </div>}
          {formError && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">{formError}</p>}
          <button className="btn-gold" onClick={createClass} disabled={busy}>
            {busy
              ? <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              : editId ? "Save changes" : "Create class"}
          </button>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {upcoming.map(c => (
          <div key={c.id} className="card p-6">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="font-display text-lg font-semibold">{c.subject}</h2>
                <p className="text-sm text-ink/50">with {c.tutor}</p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className="pill-blue">{c.platform}</span>
                {c.series_id && <span className="pill bg-gold-pale text-gold-deep">🔁 Weekly</span>}
              </div>
            </div>
            <p className="mt-3 text-sm text-ink/65">
              {fmtWAT(c.starts_at)} · {c.duration_minutes} min · {c.class_students?.length ?? 0} student(s)
            </p>
            <div className="mt-4 flex flex-wrap gap-2 border-t border-line pt-4">
              {c.attendance_locked ? (
                <span className="pill-green flex-1 text-center !py-2.5 min-w-[130px]">✓ Attendance locked</span>
              ) : (
                <button className="btn-gold !min-h-[38px] flex-1 min-w-[130px]" onClick={() => openAttendance(c)}>Take attendance</button>
              )}
              {c.link && <a className="btn-ghost !min-h-[38px]" href={c.link} target="_blank" rel="noopener noreferrer">Open link</a>}
              {!c.attendance_locked && (
                <button className="btn-ghost !min-h-[38px]" onClick={() => startEditClass(c)}>Edit</button>
              )}
              <button className="btn-danger !min-h-[38px]" onClick={() => deleteClass(c)} aria-label="Delete class">Delete</button>
              {c.series_id && (
                <button className="btn-ghost !min-h-[38px] !text-red-600" onClick={() => deleteClass(c, true)}>Delete series</button>
              )}
            </div>
          </div>
        ))}
        {!upcoming.length && <div className="card p-12 text-center text-ink/40 md:col-span-2">No upcoming classes — create one above.</div>}
      </div>

      {/* Past / finished classes — collapsed by default; delete any you no longer need. */}
      {past.length > 0 && (
        <details className="card p-5">
          <summary className="cursor-pointer select-none font-display text-lg font-semibold">
            Past classes <span className="text-ink/40">({past.length})</span>
          </summary>
          <p className="mt-1 text-sm text-ink/45">Finished sessions. Delete any you no longer need — this also clears their attendance.</p>
          <div className="mt-4 space-y-2">
            {past.map(c => (
              <div key={c.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-chalk/40 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold">{c.subject} <span className="font-normal text-ink/45">· {c.tutor}</span></p>
                  <p className="text-xs text-ink/45">
                    {fmtWAT(c.starts_at)}
                    {c.attendance_locked ? " · attendance locked" : ""}
                  </p>
                </div>
                <button className="btn-danger !min-h-[36px] !px-4 !text-sm" onClick={() => deleteClass(c)}>Delete</button>
              </div>
            ))}
          </div>
        </details>
      )}

      {attendanceFor && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm p-0 sm:items-center sm:p-4">
          <div className="w-full max-w-lg rounded-t-2xl bg-white sm:rounded-2xl">
            <div className="border-b border-line px-6 py-4">
              <h2 className="font-display text-lg font-semibold">Attendance — {attendanceFor.subject}</h2>
              <p className="text-xs text-ink/45">Tap a student to toggle present / absent. This locks once saved.</p>
            </div>
            <div className="max-h-[50vh] space-y-1.5 overflow-y-auto p-4">
              {attendanceFor.roster.map((s: any) => {
                const isPresent = present[s.id] ?? false;
                return (
                  <button key={s.id} onClick={() => setPresent(p => ({ ...p, [s.id]: !p[s.id] }))}
                    className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition
                      ${isPresent ? "border-emerald-300 bg-emerald-50" : "border-red-200 bg-red-50"}`}>
                    <span className="flex items-center gap-2 font-semibold">
                      {s.first_name} {s.last_name}
                      {joined[s.id] && <span className="pill-blue !py-0.5 !text-[10px]">Joined link</span>}
                    </span>
                    <span className={`pill ${isPresent ? "pill-green" : "pill-red"}`}>{isPresent ? "Present" : "Absent"}</span>
                  </button>
                );
              })}
            </div>
            <div className="flex gap-3 border-t border-line p-4">
              <button className="btn-ghost flex-1" onClick={() => setAttendanceFor(null)}>Cancel</button>
              <button className="btn-gold flex-1" onClick={triggerSaveAttendance} disabled={busy}>
                {busy
                  ? <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  : "Save & lock"}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmState && (
        <ConfirmModal {...confirmState} onCancel={() => setConfirmState(null)} />
      )}
    </div>
  );
}
