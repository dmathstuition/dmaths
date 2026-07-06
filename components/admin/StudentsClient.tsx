"use client";
import { useState } from "react";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabase/client";
import ConfirmModal from "@/components/ConfirmModal";
import { useToast } from "@/components/Toast";

type ConfirmState = {
  title: string; message: string; confirmLabel?: string; danger?: boolean; onConfirm: () => void;
};

export default function StudentsClient({ initial }: { initial: any[] }) {
  const supabase = supabaseBrowser();
  const push = useToast();
  const [students, setStudents] = useState<any[]>(initial);
  const [q, setQ] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);

  async function reload() {
    const { data } = await supabase.from("profiles").select("*")
      .eq("role", "student").order("created_at", { ascending: false });
    setStudents(data ?? []);
  }

  const visible = students.filter(s =>
    !q || `${s.first_name} ${s.last_name} ${s.student_code} ${s.email} ${s.level}`.toLowerCase().includes(q.toLowerCase()));

  function confirmToggleActive(s: any) {
    const deactivating = s.is_active;
    setConfirmState({
      title: deactivating ? `Deactivate ${s.first_name}?` : `Activate ${s.first_name}?`,
      message: deactivating
        ? "The student will lose access to the portal immediately."
        : "The student will regain access to the portal.",
      confirmLabel: deactivating ? "Deactivate" : "Activate",
      danger: deactivating,
      onConfirm: async () => {
        setConfirmState(null);
        setBusyId(s.id);
        await supabase.from("profiles").update({ is_active: !s.is_active }).eq("id", s.id);
        setBusyId(null);
        push(deactivating ? `${s.first_name} deactivated.` : `${s.first_name} activated.`, "success");
        reload();
      },
    });
  }

  function exportCSV() {
    const headers = ["ID","First name","Last name","Email","Phone","Level","Subjects","Guardian","Guardian contact","Avg score","Attendance","Status"];
    const rows = students.map(s => [s.student_code, s.first_name, s.last_name, s.email, s.phone, s.level,
      (s.subjects ?? []).join("; "), s.guardian_name, s.guardian_contact, s.avg_score, s.attendance,
      s.is_active ? "Active" : "Inactive"]);
    const esc = (v: any) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const csv = [headers, ...rows].map(r => r.map(esc).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = "data:text/csv;charset=utf-8,﻿" + encodeURIComponent(csv);
    a.download = `dmaths-students-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold">Students</h1>
          <p className="text-sm text-ink/45">{students.length} registered</p>
        </div>
        <button className="btn-ghost" onClick={exportCSV}>Export CSV</button>
      </div>
      <input className="field max-w-sm" placeholder="Search name, ID, level or email…" value={q} onChange={e => setQ(e.target.value)} />

      {/* Desktop: table */}
      <div className="card hidden overflow-x-auto lg:block">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="bg-chalk text-left text-[11px] uppercase tracking-wider text-ink/40">
              <th className="px-5 py-3">Student</th><th className="px-5 py-3">ID</th>
              <th className="px-5 py-3">Level</th><th className="px-5 py-3">Subjects</th>
              <th className="px-5 py-3">Avg</th><th className="px-5 py-3">Attend.</th>
              <th className="px-5 py-3">Status</th><th className="px-5 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {visible.map(s => (
              <tr key={s.id} className="border-t border-line/60">
                <td className="px-5 py-3 font-bold"><Link href={`/admin/students/${s.id}`} className="hover:text-gold-deep hover:underline">{s.first_name} {s.last_name}</Link></td>
                <td className="px-5 py-3 font-mono text-xs">{s.student_code}</td>
                <td className="px-5 py-3 text-ink/60">{s.level}</td>
                <td className="px-5 py-3">
                  <div className="flex flex-wrap gap-1">{(s.subjects ?? []).slice(0, 2).map((x: string) => <span key={x} className="pill-blue">{x}</span>)}
                    {(s.subjects ?? []).length > 2 && <span className="pill bg-line text-ink/50">+{s.subjects.length - 2}</span>}</div>
                </td>
                <td className="px-5 py-3 font-extrabold">{s.avg_score}%</td>
                <td className="px-5 py-3 text-ink/60">{s.attendance}%</td>
                <td className="px-5 py-3"><span className={s.is_active ? "pill-green" : "pill-red"}>{s.is_active ? "Active" : "Inactive"}</span></td>
                <td className="px-5 py-3">
                  <button className="text-[13px] font-bold text-gold-deep hover:underline disabled:opacity-40"
                    disabled={busyId === s.id}
                    onClick={() => confirmToggleActive(s)}>
                    {busyId === s.id
                      ? <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-ink/20 border-t-ink/60" />
                      : s.is_active ? "Deactivate" : "Activate"}
                  </button>
                </td>
              </tr>
            ))}
            {!visible.length && <tr><td colSpan={8} className="px-5 py-12 text-center text-ink/40">No students found.</td></tr>}
          </tbody>
        </table>
      </div>

      {/* Mobile: cards */}
      <div className="space-y-3 lg:hidden">
        {visible.map(s => (
          <div key={s.id} className="card p-4">
            <div className="flex items-center gap-3">
              <Link href={`/admin/students/${s.id}`}
                className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-ink font-display text-sm font-bold text-gold-soft">
                {s.first_name?.[0]}{s.last_name?.[0]}
              </Link>
              <div className="min-w-0 flex-1">
                <Link href={`/admin/students/${s.id}`} className="block truncate font-bold hover:text-gold-deep">
                  {s.first_name} {s.last_name}
                </Link>
                <p className="truncate font-mono text-xs text-ink/45">{s.student_code} · {s.level}</p>
              </div>
              <span className={s.is_active ? "pill-green" : "pill-red"}>{s.is_active ? "Active" : "Inactive"}</span>
            </div>
            <div className="mt-3 flex flex-wrap gap-1">
              {(s.subjects ?? []).slice(0, 3).map((x: string) => <span key={x} className="pill-blue">{x}</span>)}
              {(s.subjects ?? []).length > 3 && <span className="pill bg-line text-ink/50">+{s.subjects.length - 3}</span>}
            </div>
            <div className="mt-3 flex items-center justify-between border-t border-line pt-3 text-sm">
              <span className="text-ink/60">Avg <b className="text-ink">{s.avg_score}%</b> · Attend <b className="text-ink">{s.attendance}%</b></span>
              <button className="text-[13px] font-bold text-gold-deep disabled:opacity-40"
                disabled={busyId === s.id} onClick={() => confirmToggleActive(s)}>
                {busyId === s.id
                  ? <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-ink/20 border-t-ink/60" />
                  : s.is_active ? "Deactivate" : "Activate"}
              </button>
            </div>
          </div>
        ))}
        {!visible.length && <div className="card p-10 text-center text-ink/40">No students found.</div>}
      </div>

      {confirmState && (
        <ConfirmModal {...confirmState} onCancel={() => setConfirmState(null)} />
      )}
    </div>
  );
}
