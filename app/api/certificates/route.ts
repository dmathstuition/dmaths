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
  const classId = String(payload?.classId ?? "");
  const title = String(payload?.title ?? "").trim().slice(0, 120);
  const subtitle = String(payload?.subtitle ?? "").trim().slice(0, 120);
  const note = String(payload?.note ?? "").trim().slice(0, 240);
  if (!title) return NextResponse.json({ error: "A title is required." }, { status: 400 });
  if (!studentId && !classId) return NextResponse.json({ error: "Choose a student or a class." }, { status: 400 });

  const admin = supabaseAdmin();

  // Resolve the recipient list — one student, or a whole class roster.
  let recipientIds: string[] = [];
  if (classId) {
    const { data: roster } = await admin.from("class_students").select("student_id").eq("class_id", classId);
    const ids = (roster ?? []).map((r: any) => r.student_id);
    if (ids.length) {
      const { data: active } = await admin.from("profiles").select("id")
        .in("id", ids).eq("role", "student").eq("is_active", true);
      recipientIds = (active ?? []).map((r: any) => r.id);
    }
    if (!recipientIds.length) return NextResponse.json({ error: "That class has no active students." }, { status: 400 });
  } else {
    const { data: student } = await admin.from("profiles").select("id, role").eq("id", studentId).maybeSingle();
    if (!student || student.role !== "student") {
      return NextResponse.json({ error: "That learner could not be found." }, { status: 404 });
    }
    recipientIds = [studentId];
  }

  const rows = recipientIds.map((sid) => ({
    student_id: sid, title, subtitle, note, serial: makeSerial(), issued_by: gate.user.id,
  }));
  const { data: certs, error } = await admin.from("certificates").insert(rows).select("id, student_id");
  if (error) {
    const msg = /relation .*certificates.* does not exist/i.test(error.message)
      ? "Certificates need migration-certificates.sql — run it in Supabase."
      : error.message;
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  // Notify each recipient (bell + push), best-effort.
  await Promise.allSettled((certs ?? []).map((c: any) =>
    notifyUser(admin, c.student_id, {
      title: "🎓 You've earned a certificate!",
      body: `${title}${subtitle ? ` — ${subtitle}` : ""}. Tap to view and download it.`,
      link: `/certificate/${c.id}`,
    }),
  ));

  return NextResponse.json({ ok: true, issued: certs?.length ?? 0 });
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
