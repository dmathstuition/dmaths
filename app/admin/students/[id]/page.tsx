import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import StudentDetailClient from "@/components/admin/StudentDetailClient";
import { Icon } from "@/components/Icons";

export const dynamic = "force-dynamic";

export default async function StudentDetail({ params }: { params: { id: string } }) {
  const supa = supabaseServer();
  const [{ data: student }, { data: notes }, { data: rewards }, { data: subs }, { data: behaviorTypes }, { data: behaviorLogs }] = await Promise.all([
    supa.from("profiles").select("*").eq("id", params.id).single(),
    supa.from("admin_notes").select("*").eq("student_id", params.id).order("created_at", { ascending: false }),
    supa.from("rewards").select("*").eq("student_id", params.id).order("created_at", { ascending: false }),
    supa.from("assignment_submissions")
      .select("status, grade, submitted_at, assignment:assignments(title, subject)")
      .eq("student_id", params.id)
      .order("submitted_at", { ascending: true }),
    supa.from("behavior_types").select("*").eq("is_active", true).order("sort_order"),
    supa.from("behavior_logs")
      .select("*")
      .eq("student_id", params.id)
      .order("created_at", { ascending: false })
      .limit(30),
  ]);
  if (!student) redirect("/admin/students");

  // Linked parents, resolved server-side with the admin client. Doing this in
  // two steps avoids the ambiguous PostgREST embed (parent_student_links has two
  // foreign keys to profiles — parent_id AND student_id — so `parent:profiles`
  // can't be resolved and silently returned nothing, which is why the parent
  // never showed here).
  const admin = supabaseAdmin();
  const { data: links } = await admin
    .from("parent_student_links").select("parent_id").eq("student_id", params.id);
  const parentIds = (links ?? []).map((l: any) => l.parent_id);
  const { data: parents } = parentIds.length
    ? await admin.from("profiles").select("id, email, first_name, last_name").in("id", parentIds)
    : { data: [] as any[] };

  // Who referred this learner (for the header badge), if anyone.
  let referredByName: string | null = null;
  if (student.referred_by) {
    const { data: referrer } = await supa
      .from("profiles").select("first_name, last_name").eq("id", student.referred_by).maybeSingle();
    if (referrer) referredByName = `${referrer.first_name ?? ""} ${referrer.last_name ?? ""}`.trim() || null;
  }

  return (
    <div className="space-y-4">
      <a href={`/report/${params.id}`}
        className="card flex items-center gap-3 border-l-4 border-l-gold bg-gold-pale/40 p-4 transition hover:bg-gold-pale/70">
        <Icon name="reports" className="h-5 w-5 flex-shrink-0 text-gold-deep" />
        <p className="text-sm text-ink/75">
          <strong className="text-ink">Engagement report</strong> — reward points (given & earned), mocks, CBT, assignments and more. →
        </p>
      </a>
      <StudentDetailClient
        student={student}
        initialNotes={notes ?? []}
        initialRewards={rewards ?? []}
        subs={subs ?? []}
        behaviorTypes={behaviorTypes ?? []}
        initialBehaviorLogs={behaviorLogs ?? []}
        referredByName={referredByName}
        initialParents={parents ?? []}
      />
    </div>
  );
}
