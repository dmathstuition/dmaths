import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { notifyUser } from "@/lib/notify";

// Admin-only: issue or revoke a learner certificate.
async function requireAdmin() {
  const supa = supabaseServer();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return { error: "Unauthorized", status: 401 as const };
  const { data: me } = await supa.from("profiles").select("role").eq("id", user.id).single();
  if (me?.role !== "admin") return { error: "Forbidden", status: 403 as const };
  return { user };
}

function makeSerial() {
  const y = new Date().getFullYear();
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `DM-${y}-${rand}`;
}

export async function POST(req: Request) {
  const gate = await requireAdmin();
  if ("error" in gate) return NextResponse.json({ error: gate.error }, { status: gate.status });

  const payload = await req.json().catch(() => null);
  const studentId = String(payload?.studentId ?? "");
  const title = String(payload?.title ?? "").trim().slice(0, 120);
  const subtitle = String(payload?.subtitle ?? "").trim().slice(0, 120);
  const note = String(payload?.note ?? "").trim().slice(0, 240);
  if (!studentId || !title) {
    return NextResponse.json({ error: "A student and a title are required." }, { status: 400 });
  }

  const admin = supabaseAdmin();
  const { data: student } = await admin.from("profiles").select("id, role, first_name").eq("id", studentId).maybeSingle();
  if (!student || student.role !== "student") {
    return NextResponse.json({ error: "That learner could not be found." }, { status: 404 });
  }

  const { data: cert, error } = await admin.from("certificates")
    .insert({ student_id: studentId, title, subtitle, note, serial: makeSerial(), issued_by: gate.user.id })
    .select().single();
  if (error) {
    const msg = /relation .*certificates.* does not exist/i.test(error.message)
      ? "Certificates need migration-certificates.sql — run it in Supabase."
      : error.message;
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  await notifyUser(admin, studentId, {
    title: "🎓 You've earned a certificate!",
    body: `${title}${subtitle ? ` — ${subtitle}` : ""}. Tap to view and download it.`,
    link: `/certificate/${cert.id}`,
  });

  return NextResponse.json({ ok: true, certificate: cert });
}

export async function DELETE(req: Request) {
  const gate = await requireAdmin();
  if ("error" in gate) return NextResponse.json({ error: gate.error }, { status: gate.status });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const { error } = await supabaseAdmin().from("certificates").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
