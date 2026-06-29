import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { rateLimit, clientKey } from "@/lib/ratelimit";

// Public enrolment submission. Rate-limited per IP and field-whitelisted on the
// server so the browser can't spam the table or inject arbitrary columns.
// (payment_verified is never accepted from the client; the DB trigger forces it
// false on insert regardless.)
export async function POST(req: Request) {
  if (!rateLimit(clientKey(req, "apply"), 5, 60_000)) {
    return NextResponse.json(
      { error: "Too many submissions — please wait a minute and try again." },
      { status: 429 },
    );
  }

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid request." }, { status: 400 });

  for (const k of ["first_name", "last_name", "email", "phone"]) {
    if (!String(body[k] || "").trim()) {
      return NextResponse.json({ error: "Please fill in all required fields." }, { status: 400 });
    }
  }
  if (!Array.isArray(body.subjects) || body.subjects.length === 0) {
    return NextResponse.json({ error: "Select at least one subject or a package." }, { status: 400 });
  }

  const admin = supabaseAdmin();
  const { error } = await admin.from("applications").insert({
    first_name: body.first_name, last_name: body.last_name, email: body.email, phone: body.phone,
    dob: body.dob || null, address: body.address || "", level: body.level || "JSS 1",
    guardian_name: body.guardian_name || "", guardian_contact: body.guardian_contact || "",
    guardian_email: body.guardian_email || "",
    subjects: body.subjects, notes: body.notes || "",
    camp: body.camp || "", plan: body.plan || "",
    pay_plan: body.pay_plan === "part" ? "part" : "full",
    payment_ref: body.payment_ref || "", payment_method: body.payment_method || "",
    payment_amount: Number(body.payment_amount) || 0,
    payment_date: body.payment_date || null,
    consented_at: new Date().toISOString(),
  });

  if (error) return NextResponse.json({ error: "Could not submit — please try again." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
