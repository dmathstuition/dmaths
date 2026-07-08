import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { deleteLearnerCompletely, deleteParentCompletely } from "@/lib/deleteLearner";
import { notifyAdmins } from "@/lib/notify";

// Self-service account deletion (a Google Play requirement for apps with
// account creation). A signed-in student or parent permanently deletes their
// OWN account and data. Admin accounts cannot self-delete here.
export async function POST(req: Request) {
  const supa = supabaseServer();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: me } = await supa
    .from("profiles").select("role, first_name, last_name, email, student_code")
    .eq("id", user.id).single();
  if (!me) return NextResponse.json({ error: "Account not found" }, { status: 404 });
  if (me.role === "admin") {
    return NextResponse.json({ error: "Admin accounts cannot be deleted from here." }, { status: 403 });
  }

  const { confirm } = await req.json().catch(() => ({}));
  if (String(confirm ?? "").trim().toUpperCase() !== "DELETE") {
    return NextResponse.json({ error: 'Type DELETE to confirm.' }, { status: 400 });
  }

  const admin = supabaseAdmin();

  // Let the school know (before the account disappears). Best-effort.
  try {
    await notifyAdmins(admin, {
      title: "Account self-deleted",
      body: `${me.first_name ?? ""} ${me.last_name ?? ""} (${me.student_code ?? me.role}) permanently deleted their account.`,
      link: me.role === "student" ? "/admin/students" : "/admin",
    });
  } catch { /* non-fatal */ }

  const result = me.role === "student"
    ? await deleteLearnerCompletely(admin, user.id, me.email)
    : await deleteParentCompletely(admin, user.id);

  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 500 });
  return NextResponse.json({ ok: true });
}
