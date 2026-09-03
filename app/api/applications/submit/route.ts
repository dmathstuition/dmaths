import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { rateLimit, clientKey } from "@/lib/ratelimit";
import { isPackageId } from "@/lib/packages";

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

  // Bot protection (no CAPTCHA). Both checks respond with a fake success so a
  // bot believes it worked and doesn't retry/learn — but nothing is inserted.
  //  1) Honeypot: humans never see/fill the hidden `website` field.
  //  2) Time-trap: the multi-step form always takes several seconds, so a
  //     submission under 2.5s from page load is a script.
  const honeypotTripped = String(body.website || "").trim() !== "";
  const elapsed = Date.now() - Number(body.loadedAt || 0);
  const tooFast = !body.loadedAt || elapsed < 2500;
  if (honeypotTripped || tooFast) {
    return NextResponse.json({ ok: true });
  }

  for (const k of ["first_name", "last_name", "email", "phone"]) {
    if (!String(body[k] || "").trim()) {
      return NextResponse.json({ error: "Please fill in all required fields." }, { status: 400 });
    }
  }
  if (!Array.isArray(body.subjects) || body.subjects.length === 0) {
    return NextResponse.json({ error: "Select at least one subject." }, { status: 400 });
  }

  const clip = (v: unknown, n: number) => String(v ?? "").slice(0, n);
  const toISO = (v: unknown) => { const d = v ? new Date(String(v)) : null; return d && !isNaN(d.getTime()) ? d.toISOString() : null; };

  const admin = supabaseAdmin();
  const row: Record<string, any> = {
    first_name: body.first_name, last_name: body.last_name, email: body.email, phone: body.phone,
    dob: body.dob || null, address: body.address || "", level: body.level || "JSS 1",
    guardian_name: body.guardian_name || "", guardian_contact: body.guardian_contact || "",
    guardian_email: body.guardian_email || "",
    subjects: body.subjects, notes: body.notes || "",
    // Chosen enrolment package (Tier 1/2/3) + a couple of extra intake details.
    package_tier: isPackageId(body.package) ? String(body.package) : "",
    school: clip(body.school, 160),
    availability: clip(body.availability, 200),
    aptitude_at: toISO(body.aptitude_at),
    // Payment is no longer collected at sign-up — tuition is billed monthly from
    // attendance. These stay defaulted for backward compatibility with the columns.
    camp: "", plan: "",
    pay_plan: "full", payment_ref: "", payment_method: "", payment_amount: 0, payment_date: null,
    referred_by_code: String(body.ref || "").trim().slice(0, 40) || null,
    country: clip(body.country || "NG", 4),
    exam_target: clip(body.exam_target, 80),
    // Intake profile (used to plan teaching and to level the aptitude test).
    strengths: clip(body.strengths, 2000),
    challenges: clip(body.challenges, 2000),
    weak_points: clip(body.weak_points, 2000),
    exam_date: body.exam_date || null,
    target_grade: clip(body.target_grade, 120),
    consented_at: new Date().toISOString(),
  };

  const insert = () => admin.from("applications").insert({ ...row });
  let { error } = await insert();
  // If newer columns aren't migrated yet, don't fail a real signup — drop the
  // unmigrated ones and retry so registrations keep working.
  if (error && /column .*(country|exam_target|strengths|challenges|weak_points|exam_date|target_grade|package_tier|school|availability|aptitude_at)/i.test(error.message)) {
    for (const c of ["country", "exam_target", "strengths", "challenges", "weak_points", "exam_date", "target_grade", "package_tier", "school", "availability", "aptitude_at"]) delete row[c];
    ({ error } = await insert());
  }

  if (error) return NextResponse.json({ error: "Could not submit — please try again." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
