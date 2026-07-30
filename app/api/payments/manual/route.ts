import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { autoIssueReceipt } from "@/lib/receipts";

// Manual payments (bank transfer / Opay / cash) that an admin types in — money
// received outside Paystack. The ledger has no write RLS; only this service-role
// route, after an explicit admin check, may create, edit or delete one.
//
// Edit and delete are deliberately limited to rows THIS form created
// (raw.source === "manual-entry"). Paystack rows are real card money confirmed
// by a signed webhook, and application-approval rows are tied to an
// application's verified state — neither may be changed here.

async function requireAdmin() {
  const supa = supabaseServer();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  const { data: me } = await supa.from("profiles").select("role").eq("id", user.id).single();
  if (me?.role !== "admin") return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  return { user };
}

// Resolve an optional studentId to a real learner, inheriting their email when
// none was typed. Returns an error response if the id was given but isn't a
// student.
async function resolveStudent(admin: ReturnType<typeof supabaseAdmin>, studentId: string, email: string) {
  if (!studentId) return { student: null as null | { id: string; email: string | null }, email };
  const { data } = await admin.from("profiles").select("id, email, role").eq("id", studentId).maybeSingle();
  if (!data || data.role !== "student") {
    return { error: NextResponse.json({ error: "That learner could not be found." }, { status: 400 }) };
  }
  return {
    student: { id: data.id, email: data.email },
    email: email || (data.email ? String(data.email).toLowerCase() : ""),
  };
}

// Only rows this form created may be edited or deleted.
const MANUAL = (row: any) => row?.raw?.source === "manual-entry";

export async function POST(req: Request) {
  const gate = await requireAdmin();
  if ("error" in gate) return gate.error;
  const user = gate.user;

  const body = await req.json().catch(() => null);
  let email = String(body?.email ?? "").trim().toLowerCase();
  const studentId = String(body?.studentId ?? "").trim();
  const amount = Number(body?.amount);
  const method = String(body?.method ?? "").trim() || "Bank transfer";
  const reference = String(body?.reference ?? "").trim();
  const paidAt = String(body?.paidAt ?? "").trim();
  const note = String(body?.note ?? "").trim().slice(0, 300);

  const admin = supabaseAdmin();

  const resolved = await resolveStudent(admin, studentId, email);
  if ("error" in resolved) return resolved.error;
  const student = resolved.student;
  email = resolved.email;

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

  await rollSubscription(admin, student, email);
  // Give every recorded payment a receipt without the admin lifting a finger.
  await autoIssueReceipt(admin, ref, user.id);

  return NextResponse.json({ ok: true, payment: row });
}

// Edit a manual payment. The reference is never changed — it's the receipts
// foreign key — but every other field can be corrected.
export async function PATCH(req: Request) {
  const gate = await requireAdmin();
  if ("error" in gate) return gate.error;
  const user = gate.user;

  const body = await req.json().catch(() => null);
  const reference = String(body?.reference ?? "").trim();
  if (!reference) return NextResponse.json({ error: "reference required" }, { status: 400 });

  const admin = supabaseAdmin();
  const { data: existing } = await admin.from("payments").select("*").eq("reference", reference).maybeSingle();
  if (!existing) return NextResponse.json({ error: "That payment could not be found." }, { status: 404 });
  if (!MANUAL(existing)) {
    return NextResponse.json({ error: "Only manually-recorded payments can be changed." }, { status: 403 });
  }

  let email = String(body?.email ?? "").trim().toLowerCase();
  const studentId = String(body?.studentId ?? "").trim();
  const amount = Number(body?.amount);
  const method = String(body?.method ?? "").trim() || "Bank transfer";
  const paidAt = String(body?.paidAt ?? "").trim();
  const note = String(body?.note ?? "").trim().slice(0, 300);

  const resolved = await resolveStudent(admin, studentId, email);
  if ("error" in resolved) return resolved.error;
  const student = resolved.student;
  email = resolved.email;

  if (!studentId && (!email || !email.includes("@"))) {
    return NextResponse.json({ error: "Choose a learner or enter the payer's email." }, { status: 400 });
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: "Enter a valid amount (₦)." }, { status: 400 });
  }

  const update: Record<string, unknown> = {
    email,
    amount,
    channel: `Manual · ${method}`,
    paid_at: paidAt ? new Date(`${paidAt}T12:00:00+01:00`).toISOString() : existing.paid_at,
    // Preserve who first recorded it; note who edited.
    raw: { ...(existing.raw ?? {}), source: "manual-entry", edited_by: user.id, note },
    student_id: student ? student.id : null,
  };

  let { error } = await admin.from("payments").update(update).eq("reference", reference);
  if (error && /student_id/i.test(error.message)) {
    const { student_id: _omit, ...withoutLink } = update;
    ({ error } = await admin.from("payments").update(withoutLink).eq("reference", reference));
  }
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await admin.from("audit_log").insert({
    actor_id: user.id, action: "manual_payment_edited",
    detail: {
      reference,
      before: { amount: existing.amount, email: existing.email, student_id: existing.student_id ?? null },
      after: { amount, email, student_id: student?.id ?? null, method },
    },
  });

  return NextResponse.json({ ok: true });
}

// Delete a manual payment. Any receipt issued for it is removed too, by the
// on-delete-cascade on receipts.payment_reference.
export async function DELETE(req: Request) {
  const gate = await requireAdmin();
  if ("error" in gate) return gate.error;
  const user = gate.user;

  const reference = new URL(req.url).searchParams.get("reference")?.trim() ?? "";
  if (!reference) return NextResponse.json({ error: "reference required" }, { status: 400 });

  const admin = supabaseAdmin();
  const { data: existing } = await admin.from("payments").select("*").eq("reference", reference).maybeSingle();
  if (!existing) return NextResponse.json({ ok: true, alreadyGone: true });
  if (!MANUAL(existing)) {
    return NextResponse.json({ error: "Only manually-recorded payments can be deleted." }, { status: 403 });
  }

  const { data: receipt } = await admin.from("receipts").select("serial").eq("payment_reference", reference).maybeSingle();

  const { error } = await admin.from("payments").delete().eq("reference", reference);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await admin.from("audit_log").insert({
    actor_id: user.id, action: "manual_payment_deleted",
    detail: { reference, amount: existing.amount, email: existing.email, receiptSerial: receipt?.serial ?? null },
  });

  return NextResponse.json({ ok: true, hadReceipt: !!receipt });
}

// If the payer is a monthly subscriber, roll their next due date forward a month
// and clear the reminder stamp. Best-effort — no-op before the subscriptions
// migration. (Only recording rolls forward; editing/deleting does not roll back,
// which the admin is warned about in the UI.)
async function rollSubscription(
  admin: ReturnType<typeof supabaseAdmin>,
  student: { id: string } | null,
  email: string,
) {
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
}
