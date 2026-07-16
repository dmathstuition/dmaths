"use client";
import { useState, useEffect } from "react";
import { useToast } from "@/components/Toast";

interface ClassRow { id: string; subject: string; tutor?: string; starts_at: string; mode?: string; location?: string | null; }
interface ClassStudent { class_id: string; student_id: string; }
interface Student { id: string; first_name: string; last_name: string; }
interface AttendanceRecord { class_id: string; student_id: string; present: boolean; late?: boolean; }

const classLabel = (c: ClassRow) => {
  const d = new Date(c.starts_at).toLocaleDateString("en-NG", { timeZone: "Africa/Lagos", day: "numeric", month: "short" });
  return `${c.subject} · ${d}${c.mode === "physical" ? " · In-person" : ""}`;
};

export default function AttendanceClient({
  classes, classStudents, students, initialDate, initialRecords,
}: {
  classes: ClassRow[];
  classStudents: ClassStudent[];
  students: Student[];
  initialDate: string;
  initialRecords: AttendanceRecord[];
}) {
  const push = useToast();
  const [selectedClass, setSelectedClass] = useState(classes[0]?.id ?? "");
  const [sessionDate, setSessionDate] = useState(initialDate);
  const [attendance, setAttendance] = useState<Record<string, boolean>>(() => {
    const map: Record<string, boolean> = {};
    for (const r of initialRecords) if (r.class_id === classes[0]?.id) map[r.student_id] = r.present;
    return map;
  });
  const [late, setLate] = useState<Record<string, boolean>>(() => {
    const map: Record<string, boolean> = {};
    for (const r of initialRecords) if (r.class_id === classes[0]?.id && r.late) map[r.student_id] = true;
    return map;
  });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  const rosterIds = new Set(classStudents.filter(cs => cs.class_id === selectedClass).map(cs => cs.student_id));
  const roster = students.filter(s => rosterIds.has(s.id));

  async function loadAttendance(classId: string, date: string) {
    setLoading(true);
    const res = await fetch(`/api/attendance/list?classId=${classId}&date=${date}`);
    if (res.ok) {
      const { records } = await res.json();
      const map: Record<string, boolean> = {};
      const lateMap: Record<string, boolean> = {};
      for (const r of records) { map[r.student_id] = r.present; if (r.late) lateMap[r.student_id] = true; }
      setAttendance(map);
      setLate(lateMap);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadAttendance(selectedClass, sessionDate);
  }, [selectedClass, sessionDate]);

  function toggleStudent(studentId: string) {
    setAttendance(prev => ({ ...prev, [studentId]: !prev[studentId] }));
  }

  async function saveAll() {
    setSaving(true);
    let errors = 0;
    await Promise.all(roster.map(async (s) => {
      const present = attendance[s.id] ?? false;
      const res = await fetch("/api/attendance/mark", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ classId: selectedClass, studentId: s.id, sessionDate, present }),
      });
      if (!res.ok) errors++;
    }));
    setSaving(false);
    if (errors) push(`${errors} record(s) failed to save.`, "error");
    else push(`Attendance saved for ${roster.length} student${roster.length !== 1 ? "s" : ""}.`, "success");
  }

  function markAll(present: boolean) {
    const map: Record<string, boolean> = {};
    for (const s of roster) map[s.id] = present;
    setAttendance(prev => ({ ...prev, ...map }));
  }

  const presentCount = roster.filter(s => attendance[s.id] === true).length;
  const absentCount = roster.filter(s => attendance[s.id] === false).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-semibold">Attendance</h1>
      </div>

      {/* Controls */}
      <div className="card p-5">
        <div className="flex flex-wrap items-end gap-4">
          <div className="space-y-1">
            <label className="text-xs font-bold uppercase tracking-wide text-ink/40">Class</label>
            <select className="field" value={selectedClass} onChange={e => setSelectedClass(e.target.value)}>
              {classes.map(c => (
                <option key={c.id} value={c.id}>{classLabel(c)}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold uppercase tracking-wide text-ink/40">Date</label>
            <input type="date" className="field" value={sessionDate} onChange={e => setSessionDate(e.target.value)} />
          </div>
          <div className="flex gap-2 pb-0.5">
            <button onClick={() => markAll(true)} className="btn-ghost !min-h-[38px] text-sm">All present</button>
            <button onClick={() => markAll(false)} className="btn-ghost !min-h-[38px] text-sm">All absent</button>
          </div>
        </div>
      </div>

      {/* Roster */}
      <div className="card">
        {loading && <p className="p-6 text-center text-sm text-ink/40">Loading…</p>}
        {!loading && roster.length === 0 && (
          <p className="p-6 text-center text-sm text-ink/40">No students enrolled in this class.</p>
        )}
        {!loading && roster.length > 0 && (
          <>
            <div className="flex items-center justify-between border-b border-line px-5 py-3">
              <p className="text-sm text-ink/55">
                {presentCount} present · {absentCount} absent · {roster.length - presentCount - absentCount} unmarked
              </p>
              <button onClick={saveAll} disabled={saving} className="btn-gold !min-h-[34px] text-sm">
                {saving ? <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" /> : "Save"}
              </button>
            </div>
            <div className="divide-y divide-line/60">
              {roster.map(s => {
                const present = attendance[s.id];
                return (
                  <div key={s.id} className="flex items-center gap-4 px-5 py-3">
                    <span className="flex-1 font-semibold text-ink">
                      {s.first_name} {s.last_name}
                      {late[s.id] && present === true && <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-extrabold text-amber-700">Late</span>}
                    </span>
                    <div className="flex rounded-xl border border-line bg-chalk p-0.5">
                      <button onClick={() => setAttendance(prev => ({ ...prev, [s.id]: true }))}
                        className={`rounded-lg px-3 py-1 text-sm font-semibold transition ${present === true ? "bg-emerald-500 text-white shadow" : "text-ink/45"}`}>
                        Present
                      </button>
                      <button onClick={() => setAttendance(prev => ({ ...prev, [s.id]: false }))}
                        className={`rounded-lg px-3 py-1 text-sm font-semibold transition ${present === false ? "bg-red-500 text-white shadow" : "text-ink/45"}`}>
                        Absent
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
