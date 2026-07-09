import { supabaseServer } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth";
import { fmtWATDate, fmtWATTime } from "@/lib/time";

export const dynamic = "force-dynamic";

// The tutor's assigned classes, upcoming first, with a join link and roster
// count. RLS scopes classes to tutor_id = auth.uid(); we also filter explicitly.
export default async function TutorClasses() {
  const user = await getUser();
  const supa = supabaseServer();
  const { data: classes } = await supa
    .from("classes")
    .select("*, class_students(student_id)")
    .eq("tutor_id", user?.id ?? "")
    .order("starts_at", { ascending: true });

  const now = Date.now();
  const list = classes ?? [];
  const upcoming = list.filter((c: any) => new Date(c.starts_at).getTime() >= now - 2 * 60 * 60 * 1000);
  const past = list.filter((c: any) => new Date(c.starts_at).getTime() < now - 2 * 60 * 60 * 1000);

  return (
    <div className="space-y-6 py-2">
      <div>
        <h1 className="font-display text-2xl font-bold">My Classes</h1>
        <p className="text-sm text-ink/50">Classes the D-Maths team has assigned to you.</p>
      </div>

      {list.length === 0 && (
        <div className="card p-8 text-center text-sm text-ink/45">
          No classes assigned to you yet. The admin assigns you to a class from the Classes page.
        </div>
      )}

      {upcoming.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wide text-ink/40">Upcoming</h2>
          {upcoming.map((c: any) => <ClassCard key={c.id} c={c} upcoming />)}
        </section>
      )}

      {past.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wide text-ink/40">Past</h2>
          {past.slice(0, 12).map((c: any) => <ClassCard key={c.id} c={c} />)}
        </section>
      )}
    </div>
  );
}

function ClassCard({ c, upcoming = false }: { c: any; upcoming?: boolean }) {
  const roster = c.class_students?.length ?? 0;
  return (
    <div className="card flex flex-wrap items-center justify-between gap-4 p-5">
      <div>
        <div className="flex items-center gap-2">
          <span className="pill-blue">{c.subject}</span>
          <span className="text-xs font-semibold text-ink/45">{c.platform}</span>
        </div>
        <p className="mt-1.5 font-display text-lg font-bold">
          {fmtWATDate(c.starts_at)} · {fmtWATTime(c.starts_at)}
        </p>
        <p className="text-xs text-ink/45">{c.duration_minutes} min · {roster} learner{roster === 1 ? "" : "s"}</p>
      </div>
      {upcoming && c.link && (
        <a href={c.link} target="_blank" rel="noopener noreferrer" className="btn-gold !min-h-[42px] !px-6">
          Join class →
        </a>
      )}
    </div>
  );
}
