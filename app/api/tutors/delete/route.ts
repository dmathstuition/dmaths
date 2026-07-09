import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

// Admin removes a tutor completely. Deleting the auth user cascades the profile
// (and its teacher_students links + message thread); classes.tutor_id is set to
// NULL. This is the safe way to remove a tutor — doing it by hand in Supabase is
// what left orphaned auth users and "burned" emails.
export async function POST(req: Request) {
  const supa = supabaseServer();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: me } = await supa.from("profiles").select("role").eq("id", user.id).single();
  if (me?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { tutorId } = await req.json();
  if (!tutorId) return NextResponse.json({ error: "tutorId required" }, { status: 400 });

  const admin = supabaseAdmin();

  // Defensive cleanup first (in case FK cascades aren't all in place yet).
  await admin.from("teacher_students").delete().eq("teacher_id", tutorId);
  await admin.from("classes").update({ tutor_id: null }).eq("tutor_id", tutorId);

  // Delete the auth user → cascades the profile row. "Not found" = already gone.
  const { error } = await admin.auth.admin.deleteUser(tutorId);
  if (error && !/not.?found/i.test(error.message)) {
    // Auth user couldn't be removed — at least strip the profile so they can't log in.
    await admin.from("profiles").delete().eq("id", tutorId);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  // Belt and suspenders: ensure the profile is gone even if the cascade didn't fire.
  await admin.from("profiles").delete().eq("id", tutorId);

  await admin.from("audit_log").insert({ actor_id: user.id, action: "tutor_deleted", detail: { tutorId } });
  return NextResponse.json({ ok: true });
}
