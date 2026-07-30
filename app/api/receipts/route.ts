import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { issueReceiptFor } from "@/lib/receipts";

// Admin issues a numbered receipt for a row in the payments ledger. The actual
// issuing lives in lib/receipts (shared with the auto-issue paths); this route
// is just the authenticated admin entry point.
export const dynamic = "force-dynamic";

const explain = (m: string) =>
  /relation .*receipts/i.test(m) ? "Receipts need migration-receipts.sql — run it in Supabase." : m;

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
  const result = await issueReceiptFor(supabaseAdmin(), String(b?.reference ?? ""), {
    issuedBy: user.id,
    note: String(b?.note ?? ""),
    studentId: b?.studentId ? String(b.studentId) : null,
  });

  // `strict` is off in this project, so narrow with `in` rather than the `ok`
  // discriminant (truthiness narrowing on a boolean literal isn't reliable here).
  if ("receipt" in result) {
    return NextResponse.json({ ok: true, receipt: result.receipt, alreadyIssued: result.alreadyIssued });
  }
  return NextResponse.json({ error: result.error }, { status: result.status });
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
