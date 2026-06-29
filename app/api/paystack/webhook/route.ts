import { NextResponse } from "next/server";
import crypto from "crypto";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { recordPayment, depositNgnForPlan, type PaystackTxn } from "@/lib/paystack";
import { notifyAdmins } from "@/lib/notify";
import { fmtNgn } from "@/lib/summerCamp";

// Node runtime required: we need `crypto` and the raw request body to verify
// Paystack's signature. (Edge runtime would not give us a stable raw body.)
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Paystack → our server webhook. Every event is signed: the `x-paystack-signature`
// header is an HMAC-SHA512 of the EXACT raw body, keyed with our secret. We
// recompute it and compare in constant time; anything that doesn't match is
// rejected. This is what makes the endpoint safe to expose publicly.
export async function POST(req: Request) {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) return NextResponse.json({ error: "not configured" }, { status: 503 });

  const raw = await req.text();
  const signature = req.headers.get("x-paystack-signature") || "";
  const expected = crypto.createHmac("sha512", secret).update(raw).digest("hex");

  // Constant-time comparison; bail if lengths differ (timingSafeEqual throws otherwise).
  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  let event: any;
  try {
    event = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }

  // We only act on successful charges. Signature already proves authenticity,
  // so the payload's amounts can be trusted.
  if (event?.event === "charge.success" && event.data?.status === "success" && event.data?.reference) {
    const data = event.data as PaystackTxn;
    const admin = supabaseAdmin();

    // Was this reference already recorded? (Paystack retries the same event,
    // so we only alert admins the FIRST time we see it.)
    const { data: prior } = await admin
      .from("payments").select("reference").eq("reference", data.reference).maybeSingle();
    const isNew = !prior;

    // 1. Authoritative ledger (idempotent on reference — safe against retries/replays).
    await recordPayment(admin, data);

    // 1b. Alert admins that money came in (in-app bell + push). Best-effort,
    //     and only once per reference.
    if (isNew) {
      const ngn = Math.round((data.amount ?? 0) / 100);
      const payer = data.customer?.email || "a customer";
      await notifyAdmins(admin, {
        title: "New payment received",
        body: `${fmtNgn(ngn)} from ${payer}`,
        link: "/admin/applications",
      });
    }

    // 2. If the payment carries an applicationId in metadata, stamp that
    //    application verified — but only when email + currency + amount check out.
    const appId = data.metadata?.applicationId;
    if (appId) {
      const amountPaid = (data.amount ?? 0) / 100;
      const payerEmail = (data.customer?.email ?? "").toLowerCase();
      const { data: app } = await admin
        .from("applications").select("email,plan").eq("id", appId).maybeSingle();

      if (
        app &&
        app.email.toLowerCase() === payerEmail &&
        (data.currency || "NGN") === "NGN"
      ) {
        const minDue = depositNgnForPlan(app.plan);
        if (!(minDue > 0 && amountPaid < minDue)) {
          await admin.from("applications").update({
            payment_ref: data.reference,
            payment_amount: amountPaid,
            payment_verified: true,
            payment_verified_at: new Date().toISOString(),
          }).eq("id", appId);
        }
      }
    }
  }

  // Acknowledge authentic events with 200 so Paystack stops retrying.
  return NextResponse.json({ received: true });
}
