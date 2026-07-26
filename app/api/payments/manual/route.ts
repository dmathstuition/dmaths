import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

// Admin records a manual payment (bank transfer / Opay / cash) directly into
// the payments ledger — e.g. a part-payment balance, or money received outside
// an enrolment application. The ledger has no insert RLS; only this
// service-role route (after an explicit admin check) can write it.
export async function POST(req: Request) {
  const supa = supabaseServer();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: me } = await supa.from("profiles").select("role").eq("id", user.id).single();
  if (me?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  let email = String(body?.email ?? "").trim().toLowerCase();
  const studentId = String(body?.studentId ?? "").trim();
  const amount = Number(body?.amount);
  const method = String(body?.method ?? "").trim() || "Bank transfer";
  const reference = String(body?.reference ?? "").trim();
  const paidAt = String(body?.paidAt ?? "").trim();
  const note = String(body?.note ?? "").trim().slice(0, 300);

  const admin = supabaseAdmin();

  // A payment can be attached to a learner (so it shows on their portal and
  // their parent's), identified by email, or both. When a student is chosen we
  // trust their own record for the email.
  let student: { id: string; email: string | null } | null = null;
  if (studentId) {
    const { data } = await admin
      .from("profiles").select("id, email, role").eq("id", studentId).maybeSingle();
    if (!data || data.role !== "student") {
      return NextResponse.json({ error: "That learner could not be found." }, { status: 400 });
    }
    student = { id: data.id, email: data.email };
    if (!email && data.email) email = String(data.email).toLowerCase();
  }

  if (!studentId && (!email || !email.includes("@"))) {
    return NextResponse.json({ error: "Choose a learner or enter the payer's email." }, { status: 400 });
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: "Enter a valid amount (₦)." }, { status: 400 });
  }

  const ref = reference || `MANUAL-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
  const payload: Record<string, unknown> = {
    reference: ref,
    email,
    amount,
    currency: "NGN",
    channel: `Manual · ${method}`,
    status: "success",
    paid_at: paidAt ? new Date(`${paidAt}T12:00:00+01:00`).toISOString() : new Date().toISOString(),
    raw: { source: "manual-entry", recorded_by: user.id, note },
  };
  if (student) payload.student_id = student.id;

  let { data: row, error } = await admin.from("payments").insert(payload).select().single();
  // Older database without the student_id column — record it without the link
  // rather than failing the whole entry.
  if (error && /student_id/i.test(error.message)) {
    const { student_id: _omit, ...withoutLink } = payload;
    ({ data: row, error } = await admin.from("payments").insert(withoutLink).select().single());
  }

  if (error) {
    const dup = /duplicate|unique/i.test(error.message);
    return NextResponse.json(
      { error: dup ? "That reference is already recorded — use a different one." : error.message },
      { status: dup ? 409 : 500 },
    );
  }

  await admin.from("audit_log").insert({
    actor_id: user.id, action: "manual_payment_recorded",
    detail: { reference: ref, email, amount, method, studentId: student?.id ?? null },
  });

  // If the payer is a monthly subscriber, roll their next due date forward a
  // month (from the later of today / the current due date) and clear the
  // reminder stamp. Prefer the learner we were given; otherwise match by email.
  // Best-effort — no-op before the subscriptions migration.
  try {
    const q = admin.from("profiles").select("id, sub_active, sub_due_date").eq("role", "student");
    const { data: subscriber } = student
      ? await q.eq("id", student.id).maybeSingle()
      : await q.ilike("email", email).maybeSingle();
    if (subscriber?.sub_active) {
      const base = subscriber.sub_due_date && new Date(subscriber.sub_due_date) > new Date()
        ? new Date(subscriber.sub_due_date)
        : new Date();
      base.setMonth(base.getMonth() + 1);
      await admin.from("profiles").update({
        sub_due_date: base.toISOString().slice(0, 10),
        sub_reminded_at: null,
      }).eq("id", subscriber.id);
    }
  } catch { /* subscriptions not enabled yet */ }

  return NextResponse.json({ ok: true, payment: row });
}
