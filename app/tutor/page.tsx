import Link from "next/link";
import { getUser, getProfile } from "@/lib/auth";
import { getRoster } from "@/lib/authRole";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { fmtWATTime, fmtWATDate } from "@/lib/time";

export const dynamic = "force-dynamic";

export default async function TutorDashboard() {
  const [user, profile] = await Promise.all([getUser(), getProfile()]);
  const admin = supabaseAdmin();
  const uid = user?.id ?? "";

  const [rosterIds, { data: classes }, { data: unread }] = await Promise.all([
    uid ? getRoster(uid) : Promise.resolve([]),
    admin.from("classes").select("*").eq("tutor_id", uid).order("starts_at", { ascending: true }),
    admin.from("messages").select("id").eq("student_id", uid).eq("sender_role", "admin").eq("read", false),
  ]);

  const now = Date.now();
  const upcoming = (classes ?? []).filter((c: any) => new Date(c.starts_at).getTime() >= now - 2 * 60 * 60 * 1000);
  const next = upcoming[0];
  const firstName = (profile?.first_name ?? "there").split(" ")[0];

  return (
    <div className="space-y-6 py-2">
      <div>
        <h1 className="font-display text-2xl font-bold">Welcome, {firstName} 👋</h1>
        <p className="text-sm text-ink/50">Your teaching at a glance.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard href="/tutor/learners" label="My learners" value={rosterIds.length} />
        <StatCard href="/tutor/classes" label="Upcoming classes" value={upcoming.length} />
        <StatCard href="/tutor/messages" label="Unread from admin" value={(unread ?? []).length} accent />
      </div>

      <div className="card p-6">
        <h2 className="font-display text-lg font-semibold">Next class</h2>
        {next ? (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="pill-blue">{next.subject}</span>
              <p className="mt-1.5 font-display text-lg font-bold">
                {fmtWATDate(next.starts_at)} · {fmtWATTime(next.starts_at)}
              </p>
              <p className="text-xs text-ink/45">{next.platform} · {next.duration_minutes} min</p>
            </div>
            {next.link && (
              <a href={next.link} target="_blank" rel="noopener noreferrer" className="btn-gold !min-h-[42px] !px-6">
                Join class →
              </a>
            )}
          </div>
        ) : (
          <p className="mt-3 text-sm text-ink/45">No upcoming classes assigned to you.</p>
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        <Link href="/tutor/calendar" className="btn-ghost">View my calendar</Link>
        <Link href="/tutor/learners" className="btn-ghost">See my learners</Link>
      </div>
    </div>
  );
}

function StatCard({ href, label, value, accent }: { href: string; label: string; value: number; accent?: boolean }) {
  return (
    <Link href={href} className="card card-interactive p-5">
      <p className={`font-display text-3xl font-bold ${accent && value > 0 ? "text-gold-deep" : ""}`}>{value}</p>
      <p className="text-xs font-bold uppercase tracking-wide text-ink/40">{label}</p>
    </Link>
  );
}
