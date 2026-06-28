import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email";
import { loginUrl } from "@/lib/siteUrl";
import { expectedNgnForPlan } from "@/lib/paystack";
import { findTier, fmtNgn } from "@/lib/summerCamp";

// Admin-only: email a part-payer a reminder of their outstanding camp balance.
export async function POST(req: Request) {
  const supa = supabaseServer();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: me } = await supa.from("profiles").select("role").eq("id", user.id).single();
  if (me?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const admin = supabaseAdmin();
  const { data: app } = await admin.from("applications").select("*").eq("id", id).single();
  if (!app) return NextResponse.json({ error: "Application not found" }, { status: 404 });

  const full = expectedNgnForPlan(app.plan);
  const paid = Number(app.payment_amount || 0);
  const balance = Math.max(0, full - paid);
  if (app.pay_plan !== "part" || balance <= 0) {
    return NextResponse.json({ error: "No outstanding balance on this registration." }, { status: 400 });
  }

  const ok = await sendEmail("balance_reminder", app.email, {
    firstName: app.first_name,
    packageName: findTier(app.plan)?.name ?? app.plan,
    paid: fmtNgn(paid),
    balanceDue: fmtNgn(balance),
    loginUrl: loginUrl(),
  });

  if (!ok) return NextResponse.json({ error: "Email could not be sent." }, { status: 502 });
  return NextResponse.json({ ok: true });
}
