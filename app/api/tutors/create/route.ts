import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email";
import { loginUrl } from "@/lib/siteUrl";

// Admin creates a tutor account. Returns the temp credentials so the admin can
// copy/share them directly (a best-effort email is also sent). Mirrors the
// parent-invite flow in app/api/parents/link/route.ts.
export async function POST(req: Request) {
  const supa = supabaseServer();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: me } = await supa.from("profiles").select("role").eq("id", user.id).single();
  if (me?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { email: rawEmail, firstName, lastName } = await req.json();
  const email = String(rawEmail ?? "").trim().toLowerCase();
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ error: "A valid email is required" }, { status: 400 });
  }

  const admin = supabaseAdmin();

  // If a profile already exists for this email, promote it to tutor instead of
  // creating a duplicate.
  const { data: existing } = await admin
    .from("profiles").select("id, role").eq("email", email).maybeSingle();
  if (existing) {
    if (existing.role === "tutor") {
      return NextResponse.json({ ok: true, created: false, alreadyTutor: true });
    }
    return NextResponse.json(
      { error: "An account with this email already exists with a different role." },
      { status: 409 },
    );
  }

  const tempPassword =
    crypto.randomUUID().replace(/-/g, "").slice(0, 6) +
    crypto.randomUUID().replace(/-/g, "").slice(0, 4).toUpperCase() +
    "@" + Math.floor(Math.random() * 90 + 10) + "!";

  const { data: tutorAuth, error: authErr } = await admin.auth.admin.createUser({
    email, password: tempPassword, email_confirm: true,
  });
  if (authErr || !tutorAuth.user) {
    return NextResponse.json({ error: authErr?.message || "Failed to create tutor account" }, { status: 500 });
  }

  await admin.from("profiles").insert({
    id: tutorAuth.user.id,
    role: "tutor",
    first_name: (firstName || "Tutor").trim(),
    last_name: (lastName || "").trim(),
    email,
    is_active: true,
  });

  // Best-effort email (template lives in the Apps Script relay; the admin also
  // gets the credentials back to share manually if the email doesn't land).
  const emailed = await sendEmail("tutor_credentials", email, {
    tutorName: (firstName || "Tutor").trim(),
    email, tempPassword, loginUrl: loginUrl(),
  }).catch(() => false);

  await admin.from("audit_log").insert({
    actor_id: user.id, action: "tutor_created", detail: { email },
  });

  return NextResponse.json({
    ok: true, created: true, tutorId: tutorAuth.user.id,
    credentials: { email, tempPassword, loginUrl: loginUrl() }, emailed,
  });
}
