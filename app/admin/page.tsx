import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const supa = supabaseServer();
  const [{ count: students }, { count: pending }, { count: classes }, { data: recent }] = await Promise.all([
    supa.from("profiles").select("*", { count: "exact", head: true }).eq("role", "student"),
    supa.from("applications").select("*", { count: "exact", head: true }).eq("status", "pending"),
    supa.from("classes").select("*", { count: "exact", head: true }).gte("starts_at", new Date().toISOString()),
    supa.from("profiles").select("id,student_code,first_name,last_name,level,avg_score,attendance,is_active")
      .eq("role", "student").order("created_at", { ascending: false }).limit(7),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold">Admin dashboard</h1>
        <p className="text-sm text-ink/45">D-Maths Tuition Centre — control panel</p>
      </div>

      {(pending ?? 0) > 0 && (
        <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4">
          <p className="flex-1 text-sm font-bold text-amber-900">
            {pending} pending application{pending! > 1 ? "s" : ""} awaiting payment verification.
          </p>
          <Link href="/admin/applications" className="btn-gold !min-h-[38px]">Review now</Link>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Total students" value={students ?? 0} />
        <Stat label="Pending applications" value={pending ?? 0} />
        <Stat label="Upcoming classes" value={classes ?? 0} />
      </div>

      <div className="card overflow-hidden">
        <div className="flex items-center justify-between border-b border-line px-6 py-4">
          <h2 className="font-display text-lg font-semibold">Recent students</h2>
          <Link href="/admin/students" className="text-sm font-bold text-gold-deep hover:underline">View all</Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="bg-chalk text-left text-[11px] uppercase tracking-wider text-ink/40">
                <th className="px-5 py-3">Student</th><th className="px-5 py-3">ID</th>
                <th className="px-5 py-3">Level</th><th className="px-5 py-3">Avg</th>
                <th className="px-5 py-3">Attend.</th><th className="px-5 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {(recent ?? []).map(s => (
                <tr key={s.id} className="border-t border-line/60">
                  <td className="px-5 py-3 font-bold">{s.first_name} {s.last_name}</td>
                  <td className="px-5 py-3 font-mono text-xs text-ink/50">{s.student_code}</td>
                  <td className="px-5 py-3 text-ink/60">{s.level}</td>
                  <td className="px-5 py-3 font-extrabold">{s.avg_score}%</td>
                  <td className="px-5 py-3 text-ink/60">{s.attendance}%</td>
                  <td className="px-5 py-3">
                    <span className={s.is_active ? "pill-green" : "pill-red"}>{s.is_active ? "Active" : "Inactive"}</span>
                  </td>
                </tr>
              ))}
              {!recent?.length && <tr><td colSpan={6} className="px-5 py-10 text-center text-ink/40">No students yet — approve an application to begin.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="card p-5">
      <p className="text-[11px] font-extrabold uppercase tracking-wider text-ink/40">{label}</p>
      <p className="mt-2 font-display text-3xl font-semibold">{value}</p>
    </div>
  );
}
