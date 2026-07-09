import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getProfile } from "@/lib/auth";
import LearnerMessages from "@/components/portal/LearnerMessages";

export const dynamic = "force-dynamic";

// Learner's messaging hub: the D-Maths team plus each of their tutors.
export default async function StudentMessages() {
  const supa = supabaseServer();
  const me = await getProfile();
  const meId = me?.id ?? "";

  const { data: allMine } = await supa.from("messages").select("*").order("created_at", { ascending: true });
  // The admin thread is the messages with no tutor_id (works pre-migration too,
  // where tutor_id is simply absent).
  const adminThread = (allMine ?? []).filter((m: any) => !m.tutor_id);

  // Which tutors is this learner assigned to? Union of direct assignments and
  // tutors of classes they're enrolled in. Uses the service role to sidestep RLS.
  const tutors = meId ? await tutorsForLearner(meId) : [];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-3xl font-semibold">Messages</h1>
        <p className="text-sm text-ink/45">Chat with the D-Maths team{tutors.length ? " or your tutor" : ""}.</p>
      </div>
      <LearnerMessages meId={meId} initialMessages={adminThread} tutors={tutors} />
    </div>
  );
}

async function tutorsForLearner(learnerId: string): Promise<{ id: string; name: string }[]> {
  const admin = supabaseAdmin();
  const ids = new Set<string>();

  const { data: direct } = await admin.from("teacher_students").select("teacher_id").eq("student_id", learnerId);
  (direct ?? []).forEach((r: any) => ids.add(r.teacher_id));

  const { data: enrolled } = await admin.from("class_students").select("class_id").eq("student_id", learnerId);
  const classIds = (enrolled ?? []).map((r: any) => r.class_id);
  if (classIds.length) {
    const { data: cls } = await admin.from("classes").select("tutor_id").in("id", classIds).not("tutor_id", "is", null);
    (cls ?? []).forEach((c: any) => c.tutor_id && ids.add(c.tutor_id));
  }
  if (ids.size === 0) return [];

  const { data: profs } = await admin.from("profiles").select("id, first_name, last_name").in("id", [...ids]);
  return (profs ?? []).map((p: any) => ({ id: p.id, name: `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim() || "Tutor" }));
}
