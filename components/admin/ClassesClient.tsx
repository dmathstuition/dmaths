"use client";
import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";

export default function ClassesClient({ initialClasses, initialStudents }: { initialClasses: any[]; initialStudents: any[] }) {
  const supabase = supabaseBrowser();
  const [classes, setClasses] = useState<any[]>(initialClasses);
  const [students] = useState<any[]>(initialStudents);
  const [showForm, setShowForm] = useState(false);
  const [f, setF] = useState<any>({ platform: "Zoom", duration_minutes: 60, roster: [] as string[] });
  const [editId, setEditId] = useState<string | null>(null);
  const [attendanceFor, setAttendanceFor] = useState<any>(null); // class being marked
  const [present, setPresent] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);

  async function reload() {
    const { data: c } = await supabase.from("classes").select("*, class_students(student_id)").order("starts_at", { ascending: true });
    setClasses(c ?? []);
  }

  async function createClass() {
    if (!(f.subject && f.tutor && f.date && f.time)) return alert("Fill in subject, tutor, date and time.");
    const starts_at = new Date(`${f.date}T${f.time}:00`).toISOString();
    const payload = { subject: f.subject, tutor: f.tutor, platform: f.platform, starts_at,
      duration_minutes: Number(f.duration_minutes) || 60, link: f.link || "" };

    if (editId) {
      const { error } = await supabase.from("classes").update(payload).eq("id", editId);
      if (error) return alert("Could not update class.");
      setEditId(null);
    } else {
      const { data: cls, error } = await supabase.from("classes").insert(payload).select().single();
      if (error || !cls) return alert("Could not create class.");
      if (f.roster.length) {
        await supabase.from("class_students").insert(f.roster.map((sid: string) => ({ class_id: cls.id, student_id: sid })));
      }
    }
    setShowForm(false); setF({ platform: "Zoom", duration_minutes: 60, roster: [] }); reload();
  }

  function startEditClass(c: any) {
    if (c.attendance_locked) { alert("Locked classes cannot be edited."); return; }
    const d = new Date(c.starts_at);
    const pad = (n: number) => String(n).padStart(2, "0");
    setEditId(c.id);
    setF({
      subject: c.subject, tutor: c.tutor, platform: c.platform,
      date: `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`,
      time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
      duration_minutes: c.duration_minutes, link: c.link || "", roster: [],
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function openAttendance(cls: any) {
    const roster = students.filter(s => cls.class_students?.some((r: any) => r.student_id === s.id));
    if (!roster.length) return alert("No students assigned to this class yet.");
    // default everyone present
    const init: Record<string, boolean> = {};
    roster.forEach(s => { init[s.id] = true; });
    setPresent(init);
    setAttendanceFor({ ...cls, roster });
  }

  async function saveAttendance() {
    if (!confirm("Save attendance? Once saved it is LOCKED and cannot be changed.")) return;
    setBusy(true);
    const rows = attendanceFor.roster.map((s: any) => ({
      class_id: attendanceFor.id, student_id: s.id, present: present[s.id] ?? false,
    }));
    const { error: e1 } = await supabase.from("attendance_records")
      .upsert(rows, { onConflict: "class_id,student_id,session_date" });
    if (e1) { setBusy(false); return alert("Could not save attendance."); }
    // lock the class
    await supabase.from("classes")
      .update({ attendance_locked: true, attendance_taken_at: new Date().toISOString() })
      .eq("id", attendanceFor.id);
    setBusy(false);
    setAttendanceFor(null);
    reload();
  }

  async function deleteClass(c: any) {
    if (c.attendance_locked) {
      alert("This class has locked attendance and cannot be deleted — its records are part of your history.");
      return;
    }
    if (!confirm(`Delete "${c.subject}"? This also removes its roster. This cannot be undone.`)) return;
    await supabase.from("classes").delete().eq("id", c.id);
    reload();
  }

  const upcoming = classes.filter(c => new Date(c.starts_at) >= new Date(Date.now() - 86400000));

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
          {!editId && <div>
            <p className="flabel">Assign students</p>
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
          <button className="btn-gold" onClick={createClass}>{editId ? "Save changes" : "Create class"}</button>
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
              <span className="pill-blue">{c.platform}</span>
            </div>
            <p className="mt-3 text-sm text-ink/65">
              {new Date(c.starts_at).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" })} · {c.duration_minutes} min · {c.class_students?.length ?? 0} student(s)
            </p>
            <div className="mt-4 flex gap-2 border-t border-line pt-4">
              {c.attendance_locked ? (
                <span className="pill-green flex-1 text-center !py-2.5">✓ Attendance locked</span>
              ) : (
                <button className="btn-gold !min-h-[38px] flex-1" onClick={() => openAttendance(c)}>Take attendance</button>
              )}
              {c.link && <a className="btn-ghost !min-h-[38px]" href={c.link} target="_blank" rel="noopener noreferrer">Open link</a>}
              {!c.attendance_locked && (
                <>
                  <button className="btn-ghost !min-h-[38px]" onClick={() => startEditClass(c)}>Edit</button>
                  <button className="btn-danger !min-h-[38px]" onClick={() => deleteClass(c)} aria-label="Delete class">Delete</button>
                </>
              )}
            </div>
          </div>
        ))}
        {!upcoming.length && <div className="card p-12 text-center text-ink/40 md:col-span-2">No upcoming classes — create one above.</div>}
      </div>

      {/* Attendance modal */}
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
                    <span className="font-semibold">{s.first_name} {s.last_name}</span>
                    <span className={`pill ${isPresent ? "pill-green" : "pill-red"}`}>{isPresent ? "Present" : "Absent"}</span>
                  </button>
                );
              })}
            </div>
            <div className="flex gap-3 border-t border-line p-4">
              <button className="btn-ghost flex-1" onClick={() => setAttendanceFor(null)}>Cancel</button>
              <button className="btn-gold flex-1" onClick={saveAttendance} disabled={busy}>
                {busy ? "Saving…" : "Save & lock"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
