"use client";
import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";

export default function ClassesClient({ initialClasses, initialStudents }: { initialClasses: any[]; initialStudents: any[] }) {
  const supabase = supabaseBrowser();
  const [classes, setClasses] = useState<any[]>(initialClasses);
  const [students] = useState<any[]>(initialStudents);
  const [showForm, setShowForm] = useState(false);
  const [f, setF] = useState<any>({ platform: "Zoom", duration_minutes: 60, roster: [] as string[] });

  async function reload() {
    const { data: c } = await supabase.from("classes").select("*, class_students(student_id)").order("starts_at", { ascending: true });
    setClasses(c ?? []);
  }

  async function createClass() {
    if (!(f.subject && f.tutor && f.date && f.time)) return alert("Fill in subject, tutor, date and time.");
    const starts_at = new Date(`${f.date}T${f.time}:00`).toISOString();
    const { data: cls, error } = await supabase.from("classes")
      .insert({ subject: f.subject, tutor: f.tutor, platform: f.platform, starts_at,
        duration_minutes: Number(f.duration_minutes) || 60, link: f.link || "" })
      .select().single();
    if (error || !cls) return alert("Could not create class.");
    if (f.roster.length) {
      await supabase.from("class_students").insert(f.roster.map((sid: string) => ({ class_id: cls.id, student_id: sid })));
    }
    setShowForm(false); setF({ platform: "Zoom", duration_minutes: 60, roster: [] }); reload();
  }

  async function markAttendance(cls: any) {
    const roster = students.filter(s => cls.class_students?.some((r: any) => r.student_id === s.id));
    if (!roster.length) return alert("No students assigned to this class yet.");
    const absentNames = prompt(
      `Marking attendance for ${cls.subject}.\nEveryone is marked PRESENT by default.\nType absent students' first names separated by commas (or leave blank):`
    );
    if (absentNames === null) return;
    const absent = absentNames.toLowerCase().split(",").map(x => x.trim()).filter(Boolean);
    const rows = roster.map(s => ({
      class_id: cls.id, student_id: s.id,
      present: !absent.includes(s.first_name.toLowerCase()),
    }));
    await supabase.from("attendance_records").upsert(rows, { onConflict: "class_id,student_id,session_date" });
    alert("Attendance saved — student attendance percentages updated automatically.");
  }

  const upcoming = classes.filter(c => new Date(c.starts_at) >= new Date(Date.now() - 86400000));
  const past = classes.filter(c => new Date(c.starts_at) < new Date(Date.now() - 86400000));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold">Classes</h1>
          <p className="text-sm text-ink/45">{upcoming.length} upcoming · {past.length} past</p>
        </div>
        <button className="btn-gold" onClick={() => setShowForm(v => !v)}>{showForm ? "Cancel" : "+ Create class"}</button>
      </div>

      {showForm && (
        <div className="card space-y-4 p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <input className="field" placeholder="Subject (e.g. Algebra Fundamentals)" value={f.subject || ""} onChange={e => setF({ ...f, subject: e.target.value })} />
            <input className="field" placeholder="Tutor name" value={f.tutor || ""} onChange={e => setF({ ...f, tutor: e.target.value })} />
            <input className="field" type="date" value={f.date || ""} onChange={e => setF({ ...f, date: e.target.value })} />
            <input className="field" type="time" value={f.time || ""} onChange={e => setF({ ...f, time: e.target.value })} />
            <select className="field" value={f.platform} onChange={e => setF({ ...f, platform: e.target.value })}>
              <option>Zoom</option><option>Google Meet</option><option>Microsoft Teams</option>
            </select>
            <input className="field" type="number" min={15} step={15} placeholder="Duration (minutes)" value={f.duration_minutes} onChange={e => setF({ ...f, duration_minutes: e.target.value })} />
            <input className="field sm:col-span-2" placeholder="Class link (https://…)" value={f.link || ""} onChange={e => setF({ ...f, link: e.target.value })} />
          </div>
          <div>
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
          </div>
          <button className="btn-gold" onClick={createClass}>Create class</button>
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
              {new Date(c.starts_at).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" })} · {c.duration_minutes} min
              · {c.class_students?.length ?? 0} student(s)
            </p>
            <div className="mt-4 flex gap-2 border-t border-line pt-4">
              <button className="btn-gold !min-h-[38px] flex-1" onClick={() => markAttendance(c)}>Mark attendance</button>
              {c.link && <a className="btn-ghost !min-h-[38px]" href={c.link} target="_blank" rel="noopener noreferrer">Open link</a>}
            </div>
          </div>
        ))}
        {!upcoming.length && <div className="card p-12 text-center text-ink/40 md:col-span-2">No upcoming classes — create one above.</div>}
      </div>
    </div>
  );
}
