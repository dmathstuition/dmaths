import { Icon } from "@/components/Icons";
import NoChildren from "@/components/parent/NoChildren";
import { getParentChildren, childName } from "@/lib/parentAccess";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function ParentAttendancePage() {
  const ctx = await getParentChildren();
  if (!ctx) return null;
  if (!ctx.children.length) return <NoChildren />;

  const admin = supabaseAdmin();
  const ids = ctx.children.map((c) => c.id);

  // `late` may not exist before migration-attendance-late.sql — fall back cleanly.
  const first = await admin.from("attendance_records")
    .select("student_id, class_id, session_date, present, late")
    .in("student_id", ids).order("session_date", { ascending: false }).limit(300);
  let records: any[] = first.data ?? [];
  if (first.error) {
    const fb = await admin.from("attendance_records")
      .select("student_id, class_id, session_date, present")
      .in("student_id", ids).order("session_date", { ascending: false }).limit(300);
    records = fb.data ?? [];
  }

  const classIds = Array.from(new Set(records.map((r) => r.class_id)));
  const { data: classes } = classIds.length
    ? await admin.from("classes").select("id, subject").in("id", classIds)
    : { data: [] as any[] };
  const subjectFor = new Map((classes ?? []).map((c: any) => [c.id, c.subject]));

  const present = records.filter((r) => r.present).length;
  const pct = records.length ? Math.round((present / records.length) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="boardgrid relative flex items-center gap-4 overflow-hidden rounded-2xl bg-board p-7 text-white">
        <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-gold/15 text-gold ring-1 ring-gold/25">
          <Icon name="checkCircle" className="h-6 w-6" />
        </span>
        <div>
          <h1 className="font-display text-2xl font-semibold sm:text-3xl">Attendance</h1>
          <p className="mt-1 text-sm text-white/50">
            {records.length ? `${present} of ${records.length} sessions attended · ${pct}%` : "No sessions recorded yet."}
          </p>
        </div>
      </div>

      <div className="card neu-card overflow-hidden">
        {records.length ? (
          <div className="divide-y divide-line/60">
            {records.map((r, i) => {
              const child = ctx.children.find((c) => c.id === r.student_id);
              const status = r.present ? (r.late ? "Late" : "Present") : "Absent";
              const cls = r.present
                ? r.late ? "bg-amber-100 text-amber-700" : "bg-emerald-50 text-emerald-700"
                : "bg-red-50 text-red-600";
              return (
                <div key={i} className="flex items-center gap-3 px-5 py-3.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-ink">{subjectFor.get(r.class_id) ?? "Class"}</p>
                    <p className="text-xs text-ink/50">
                      {new Date(r.session_date).toLocaleDateString("en-NG", { dateStyle: "medium" })}
                      {ctx.children.length > 1 && child ? ` · ${childName(child)}` : ""}
                    </p>
                  </div>
                  <span className={`flex-shrink-0 rounded-full px-2.5 py-1 text-[11px] font-extrabold ${cls}`}>{status}</span>
                </div>
              );
            })}
          </div>
        ) : <p className="p-6 text-center text-sm text-ink/40">Attendance will appear here once classes begin.</p>}
      </div>
    </div>
  );
}
