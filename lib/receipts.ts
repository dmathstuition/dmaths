// Issue a numbered receipt for a payment. One place, called three ways:
//   • the admin "Issue receipt" button (app/api/receipts POST)
//   • automatically when a Paystack charge succeeds (the webhook)
//   • automatically when an admin records a manual payment
//
// Idempotent on the payment reference — a payment can only ever have one
// receipt, and its number never changes once issued. Auto-issuing is
// best-effort: a missing receipts table (migration not run) or a mail hiccup
// must never break the payment it belongs to.
import type { SupabaseClient } from "@supabase/supabase-js";
import { sendEmail } from "@/lib/email";
import { siteBaseUrl } from "@/lib/siteUrl";
import { fmtNgn } from "@/lib/summerCamp";

export type IssueResult =
  | { ok: true; receipt: { id: string; serial: string }; alreadyIssued: boolean }
  | { ok: false; error: string; status: number; missingTable?: boolean };

export function receiptSerial() {
  return `RCT-${new Date().getFullYear()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

const isMissingTable = (m: string) => /relation .*receipts.* does not exist/i.test(m);

export async function issueReceiptFor(
  admin: SupabaseClient,
  reference: string,
  opts: { issuedBy?: string | null; note?: string; studentId?: string | null; auto?: boolean } = {},
): Promise<IssueResult> {
  const ref = String(reference ?? "").trim();
  if (!ref) return { ok: false, error: "A payment reference is required.", status: 400 };

  const { data: payment } = await admin
    .from("payments").select("reference, email, amount, paid_at, status, student_id").eq("reference", ref).maybeSingle();
  if (!payment) return { ok: false, error: "That payment isn't in the ledger.", status: 404 };
  if (payment.status !== "success") {
    return { ok: false, error: "Only a successful payment can be receipted.", status: 400 };
  }

  // Already issued? Hand back the existing one — a receipt number must never
  // change once a family has it.
  try {
    const { data: prior } = await admin
      .from("receipts").select("id, serial").eq("payment_reference", ref).maybeSingle();
    if (prior) return { ok: true, receipt: prior, alreadyIssued: true };
  } catch { /* fall through to the insert, which surfaces a missing table */ }

  const payerEmail = (payment.email ?? "").toLowerCase();

  // Prefer the payment's own student link; otherwise the explicit studentId;
  // otherwise resolve the payer's email to a learner (their own account, or the
  // child whose guardian email paid — only when unambiguous).
  let studentId: string | null = payment.student_id ?? opts.studentId ?? null;
  if (!studentId && payerEmail) {
    const { data: own } = await admin
      .from("profiles").select("id").ilike("email", payerEmail).eq("role", "student").maybeSingle();
    if (own) studentId = own.id;
    if (!studentId) {
      const { data: ward } = await admin
        .from("profiles").select("id").ilike("guardian_email", payerEmail).eq("role", "student").limit(2);
      if (ward?.length === 1) studentId = ward[0].id;
    }
  }

  const note = String(opts.note ?? "").trim().slice(0, 200);
  const { data: receipt, error } = await admin.from("receipts").insert({
    payment_reference: ref,
    serial: receiptSerial(),
    student_id: studentId,
    payer_email: payerEmail,
    amount: payment.amount ?? 0,
    paid_at: payment.paid_at,
    note,
    issued_by: opts.issuedBy ?? null,
  }).select("id, serial").single();

  if (error) {
    if (isMissingTable(error.message)) {
      return { ok: false, error: "Receipts need migration-receipts.sql — run it in Supabase.", status: 503, missingTable: true };
    }
    // A concurrent auto+manual issue can race on the unique reference; treat a
    // duplicate as "already issued" rather than an error.
    if (/duplicate|unique/i.test(error.message)) {
      const { data: existing } = await admin.from("receipts").select("id, serial").eq("payment_reference", ref).maybeSingle();
      if (existing) return { ok: true, receipt: existing, alreadyIssued: true };
    }
    return { ok: false, error: error.message, status: 500 };
  }

  await admin.from("audit_log").insert({
    actor_id: opts.issuedBy ?? null,
    action: "receipt_issued",
    detail: { reference: ref, serial: receipt.serial, studentId, auto: !!opts.auto },
  });

  // Best-effort email — the receipt is downloadable whether or not the relay has
  // a `receipt_issued` template.
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

  return { ok: true, receipt, alreadyIssued: false };
}

// Fire-and-forget wrapper for the auto paths (webhook / manual entry): never
// throws, so it can't break the payment it's attached to.
export async function autoIssueReceipt(admin: SupabaseClient, reference: string, issuedBy?: string | null) {
  try {
    await issueReceiptFor(admin, reference, { auto: true, issuedBy: issuedBy ?? null });
  } catch { /* auto-issue is best-effort */ }
}
