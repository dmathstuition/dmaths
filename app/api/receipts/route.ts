import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email";
import { siteBaseUrl } from "@/lib/siteUrl";
import { fmtNgn } from "@/lib/summerCamp";

// Admin issues a numbered receipt for a row in the payments ledger.
//
// The ledger is keyed by the payer's EMAIL, so issuing resolves that address to
// a learner where it can. When it can't (a parent paying from their own
// address), the admin picks the learner and sends `studentId` explicitly.
export const dynamic = "force-dynamic";

const explain = (m: string) =>
  /relation .*receipts/i.test(m) ? "Receipts need migration-receipts.sql — run it in Supabase." : m;

function makeSerial() {
  return `RCT-${new Date().getFullYear()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

async function requireAdmin() {
  const supa = supabaseServer();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return null;
  const { data: me } = await supa.from("profiles").select("role").eq("id", user.id).single();
  return me?.role === "admin" ? user : null;
}

export async function POST(req: Request) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const b = await req.json().catch(() => null);
  const reference = String(b?.reference ?? "").trim();
  const note = String(b?.note ?? "").trim().slice(0, 200);
  if (!reference) return NextResponse.json({ error: "A payment reference is required." }, { status: 400 });

  const admin = supabaseAdmin();

  const { data: payment } = await admin
    .from("payments").select("reference, email, amount, paid_at, status").eq("reference", reference).maybeSingle();
  if (!payment) return NextResponse.json({ error: "That payment isn't in the ledger." }, { status: 404 });
  if (payment.status !== "success") {
    return NextResponse.json({ error: "Only a successful payment can be receipted." }, { status: 400 });
  }

  // Already issued? Hand back the existing one — a receipt number must never
  // change once a family has it.
  const { data: prior } = await admin
    .from("receipts").select("id, serial").eq("payment_reference", reference).maybeSingle();
  if (prior) return NextResponse.json({ ok: true, receipt: prior, alreadyIssued: true });

  const payerEmail = (payment.email ?? "").toLowerCase();
  let studentId: string | null = b?.studentId ? String(b.studentId) : null;

  if (!studentId && payerEmail) {
    // The payer's own account first; failing that, a learner whose guardian
    // email is the one that paid.
    const { data: own } = await admin
      .from("profiles").select("id, role").ilike("email", payerEmail).eq("role", "student").maybeSingle();
    if (own) studentId = own.id;
    if (!studentId) {
      const { data: ward } = await admin
        .from("profiles").select("id").ilike("guardian_email", payerEmail).eq("role", "student").limit(2);
      // Only auto-link when it's unambiguous.
      if (ward?.length === 1) studentId = ward[0].id;
    }
  }

  const { data: receipt, error } = await admin.from("receipts").insert({
    payment_reference: reference,
    serial: makeSerial(),
    student_id: studentId,
    payer_email: payerEmail,
    amount: payment.amount ?? 0,
    paid_at: payment.paid_at,
    note,
    issued_by: user.id,
  }).select("id, serial").single();

  if (error) return NextResponse.json({ error: explain(error.message) }, { status: 500 });

  await admin.from("audit_log").insert({
    actor_id: user.id, action: "receipt_issued",
    detail: { reference, serial: receipt.serial, studentId },
  });

  // Best-effort: the receipt is downloadable whether or not the relay has a
  // `receipt_issued` template, so a missing template never blocks issuing.
  if (payerEmail) {
    await sendEmail("receipt_issued", payerEmail, {
      serial: receipt.serial,
      amount: fmtNgn(Number(payment.amount ?? 0)),
      paidAt: payment.paid_at
        ? new Date(payment.paid_at).toLocaleDateString("en-NG", { timeZone: "Africa/Lagos", dateStyle: "medium" })
        : "",
      note,
      receiptUrl: `${siteBaseUrl()}/receipt/${receipt.id}`,
    });
  }

  return NextResponse.json({ ok: true, receipt });
}

// Remove a receipt issued by mistake. The payment itself is untouched.
export async function DELETE(req: Request) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const id = new URL(req.url).searchParams.get("id") ?? "";
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const admin = supabaseAdmin();
  const { error } = await admin.from("receipts").delete().eq("id", id);
  if (error) return NextResponse.json({ error: explain(error.message) }, { status: 500 });

  await admin.from("audit_log").insert({ actor_id: user.id, action: "receipt_voided", detail: { id } });
  return NextResponse.json({ ok: true });
}
