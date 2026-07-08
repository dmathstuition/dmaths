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
  const email = String(body?.email ?? "").trim().toLowerCase();
  const amount = Number(body?.amount);
  const method = String(body?.method ?? "").trim() || "Bank transfer";
  const reference = String(body?.reference ?? "").trim();
  const paidAt = String(body?.paidAt ?? "").trim();
  const note = String(body?.note ?? "").trim().slice(0, 300);

  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Enter the payer's email." }, { status: 400 });
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: "Enter a valid amount (₦)." }, { status: 400 });
  }

  const admin = supabaseAdmin();
  const ref = reference || `MANUAL-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
  const { data: row, error } = await admin.from("payments").insert({
    reference: ref,
    email,
    amount,
    currency: "NGN",
    channel: `Manual · ${method}`,
    status: "success",
    paid_at: paidAt ? new Date(`${paidAt}T12:00:00+01:00`).toISOString() : new Date().toISOString(),
    raw: { source: "manual-entry", recorded_by: user.id, note },
  }).select().single();

  if (error) {
    const dup = /duplicate|unique/i.test(error.message);
    return NextResponse.json(
      { error: dup ? "That reference is already recorded — use a different one." : error.message },
      { status: dup ? 409 : 500 },
    );
  }

  await admin.from("audit_log").insert({
    actor_id: user.id, action: "manual_payment_recorded",
    detail: { reference: ref, email, amount, method },
  });

  return NextResponse.json({ ok: true, payment: row });
}
