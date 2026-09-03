import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireStaff } from "@/lib/authRole";
import { rateLimit } from "@/lib/ratelimit";
import { aiErrorResponse } from "@/lib/ai";
import { createAptitudeTest } from "@/lib/aptitudeGenerate";

// Admin-only: draft a leveled aptitude test for a learner with the A.I, using
// their class, exam target and the intake profile captured at sign-up. Creates
// a DRAFT row for the admin to preview/edit before approving — nothing is shown
// to the family until it's approved. (Generation also runs automatically the
// moment an application is approved; this endpoint is for regenerating or
// creating a test on demand.)
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: Request) {
  const staff = await requireStaff();
  if (!staff || staff.role !== "admin") return NextResponse.json({ error: "Admins only." }, { status: 403 });
  if (!rateLimit(`aptitude-gen:${staff.id}`, 6, 60_000)) {
    return NextResponse.json({ error: "Give it a few seconds and try again." }, { status: 429 });
  }

  const b = await req.json().catch(() => null);
  const studentId = String(b?.studentId ?? "");
  const count = Math.min(15, Math.max(5, Number(b?.count) || 10));
  if (!studentId) return NextResponse.json({ error: "Pick a learner first." }, { status: 400 });

  const admin = supabaseAdmin();
  let result;
  try {
    result = await createAptitudeTest(admin, { studentId, count, createdBy: staff.id });
  } catch (err) {
    return aiErrorResponse(err);
  }
  if (result.error) return NextResponse.json({ error: result.error }, { status: result.status ?? 500 });
  return NextResponse.json({ ok: true, test: result.test });
}
