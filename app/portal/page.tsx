import Link from "next/link";
import JoinClassButton from "@/components/portal/JoinClassButton";
import { supabaseServer } from "@/lib/supabase/server";
import { getUser, getProfile } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function StudentDashboard() {
  const user = await getUser();
  const supa = supabaseServer();
  const [me, { data: classes }, { data: subs }, { data: notices }] = await Promise.all([
    getProfile(),
    supa.from("classes").select("*").gte("starts_at", new Date().toISOString()).order("starts_at").limit(3),
    supa.from("assignment_submissions").select("status").eq("student_id", user!.id),
    supa.from("notices").select("id,title,created_at").order("created_at", { ascending: false }).limit(3),
  ]);

  const pending = (subs ?? []).filter(s => s.status === "pending").length;

  return (
    <div className="space-y-6">
      <div className="boardgrid relative overflow-hidden rounded-2xl bg-board p-7 text-white">
        <p className="pill-gold mb-3">🎓 {me?.level || "Student"}</p>
        <h1 className="font-display text-2xl font-semibold sm:text-3xl">Welcome back, {me?.first_name}!</h1>
        <p className="mt-2 text-sm text-white/50">ID: <span className="font-mono text-white/80">{me?.student_code}</span></p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Upcoming classes" value={classes?.length ?? 0} />
        <Stat label="Pending tasks" value={pending} highlight={pending > 0} />
        <Stat label="Average score" value={`${me?.avg_score ?? 0}%`} />
        <Stat label="Attendance" value={`${me?.attendance ?? 0}%`} />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="card p-6">
          <h2 className="mb-4 font-display text-lg font-semibold">Next classes</h2>
          {(classes ?? []).map(c => (
            <div key={c.id} className="mb-3 flex items-center justify-between border-b border-line pb-3 last:border-0">
              <div>
                <p className="text-sm font-extrabold">{c.subject}</p>
                <p className="text-xs text-ink/45">
                  {new Date(c.starts_at).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" })} · {c.tutor}
                </p>
              </div>
              {c.link && <JoinClassButton classId={c.id} link={c.link} label="Join" className="btn-gold !min-h-[34px] !px-3 !text-xs" />}
            </div>
          ))}
          {!classes?.length && <p className="py-4 text-sm text-ink/40">No upcoming classes scheduled yet.</p>}
          <Link href="/portal/classes" className="text-sm font-bold text-gold-deep hover:underline">View all classes →</Link>
        </div>

        <div className="card p-6">
          <h2 className="mb-4 font-display text-lg font-semibold">Latest notices</h2>
          {(notices ?? []).map(n => (
            <div key={n.id} className="mb-3 border-b border-line pb-3 last:border-0">
              <p className="text-sm font-bold">{n.title}</p>
              <p className="text-xs text-ink/40">{new Date(n.created_at).toLocaleDateString("en-NG", { dateStyle: "medium" })}</p>
            </div>
          ))}
          {!notices?.length && <p className="py-4 text-sm text-ink/40">No notices yet.</p>}
          <Link href="/portal/notices" className="text-sm font-bold text-gold-deep hover:underline">View all notices →</Link>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string | number; highlight?: boolean }) {
  return (
    <div className={`card p-5 ${highlight ? "ring-2 ring-gold/40" : ""}`}>
      <p className="text-[11px] font-extrabold uppercase tracking-wider text-ink/40">{label}</p>
      <p className="mt-2 font-display text-3xl font-semibold">{value}</p>
    </div>
  );
}
