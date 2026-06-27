import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { paystackSecret, verifyTransaction, recordPayment, expectedNgnForPlan } from "@/lib/paystack";

export const runtime = "nodejs";

// Verifies a Paystack transaction server-side using the secret key, records it
// in the authoritative `payments` ledger, and enforces currency + amount.
// The browser never sees the secret key and cannot fake any of these checks.
export async function POST(req: Request) {
  if (!paystackSecret()) {
    return NextResponse.json({ error: "Payments not configured" }, { status: 503 });
  }

  const { reference, applicationId, plan } = await req.json();
  if (!reference || typeof reference !== "string") {
    return NextResponse.json({ error: "reference required" }, { status: 400 });
  }

  // 1. Confirm with Paystack that this reference actually succeeded.
  const result = await verifyTransaction(reference);
  if (!result.ok || !result.data) {
    return NextResponse.json(
      { verified: false, error: result.error || "Payment not successful" },
      { status: 400 },
    );
  }
  const data = result.data;

  // 2. Currency must be naira.
  if ((data.currency || "NGN") !== "NGN") {
    return NextResponse.json({ verified: false, error: "Unexpected currency" }, { status: 400 });
  }

  const amountPaid = (data.amount ?? 0) / 100;
  const payerEmail = (data.customer?.email ?? "").toLowerCase();
  const admin = supabaseAdmin();

  // 3. Record into the authoritative ledger (idempotent on reference).
  await recordPayment(admin, data);

  // 4. For camp packages we know the exact price — reject underpayment.
  const expected = expectedNgnForPlan(plan ?? data.metadata?.plan);
  if (expected > 0 && amountPaid < expected) {
    return NextResponse.json(
      {
        verified: false,
        error: `Amount paid (₦${amountPaid.toLocaleString("en-NG")}) is less than the package price (₦${expected.toLocaleString("en-NG")}).`,
      },
      { status: 400 },
    );
  }

  // 5. If tied to an application, cross-check the payer email and stamp it
  //    (service role — the only path that can set payment_verified = true).
  if (applicationId) {
    const { data: app } = await admin
      .from("applications").select("email").eq("id", applicationId).single();
    if (!app || app.email.toLowerCase() !== payerEmail) {
      return NextResponse.json({ error: "Payment email does not match application" }, { status: 400 });
    }
    await admin.from("applications").update({
      payment_ref: reference,
      payment_amount: amountPaid,
      payment_verified: true,
      payment_verified_at: new Date().toISOString(),
    }).eq("id", applicationId);
  }

  return NextResponse.json({ verified: true, amount: amountPaid, email: payerEmail });
}
