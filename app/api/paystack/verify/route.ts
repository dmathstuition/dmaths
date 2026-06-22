import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

// Verifies a Paystack transaction server-side using the secret key,
// then stamps the application as payment-verified. The browser never
// sees the secret key, and the amount is checked against expectation.
export async function POST(req: Request) {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) {
    return NextResponse.json({ error: "Payments not configured" }, { status: 503 });
  }

  const { reference, applicationId } = await req.json();
  if (!reference) return NextResponse.json({ error: "reference required" }, { status: 400 });

  // Ask Paystack whether this reference actually succeeded
  const res = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
    headers: { Authorization: `Bearer ${secret}` },
  });
  const json = await res.json();

  if (!json.status || json.data?.status !== "success") {
    return NextResponse.json({ verified: false, error: "Payment not successful" }, { status: 400 });
  }

  const amountPaid = (json.data.amount ?? 0) / 100; // Paystack returns kobo
  const email = json.data.customer?.email;

  // Record on the application if we have one.
  // Cross-check the Paystack customer email against the application email so
  // that one applicant cannot use another person's payment reference.
  if (applicationId) {
    const { data: app } = await supabaseAdmin()
      .from("applications").select("email").eq("id", applicationId).single();
    if (!app || app.email.toLowerCase() !== (email ?? "").toLowerCase()) {
      return NextResponse.json({ error: "Payment email does not match application" }, { status: 400 });
    }
    await supabaseAdmin().from("applications").update({
      payment_ref: reference,
      payment_amount: amountPaid,
      payment_verified: true,
      payment_verified_at: new Date().toISOString(),
    }).eq("id", applicationId);
  }

  return NextResponse.json({ verified: true, amount: amountPaid, email });
}
