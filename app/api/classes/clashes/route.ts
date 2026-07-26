import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireStaff } from "@/lib/authRole";
import { detectClashes, type Candidate } from "@/lib/clashLookup";

// "Would this time double-book anybody?" — a read-only check the admin
// scheduler calls before writing a class of its own.
//
// The tutor form doesn't need this: /api/classes/manage answers 409 with the
// same list on the way in. Both share lib/clashLookup so the two paths can't
// drift apart.
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const staff = await requireStaff();
  if (!staff) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const b = await req.json().catch(() => null);
  const startsAt = String(b?.startsAt ?? "").trim();
  const start = new Date(startsAt);
  if (!startsAt || isNaN(start.getTime())) {
    return NextResponse.json({ error: "A valid start time is required." }, { status: 400 });
  }

  const duration = Math.min(300, Math.max(15, Math.round(Number(b?.durationMinutes) || 60)));
  const weeks = Math.min(26, Math.max(1, Math.round(Number(b?.weeks) || 1)));
  const studentIds: string[] = Array.isArray(b?.studentIds) ? b.studentIds.map(String) : [];
  // A tutor can only ever be checking against themselves.
  const tutorId = staff.role === "tutor" ? staff.id : (b?.tutorId ? String(b.tutorId) : null);
  const ignoreIds = b?.classId ? [String(b.classId)] : [];

  const slots: Candidate[] = Array.from({ length: weeks }).map((_, i) => ({
    startsAt: new Date(start.getTime() + i * 7 * 24 * 60 * 60 * 1000).toISOString(),
    durationMinutes: duration,
    tutorId,
    studentIds,
  }));

  const clashes = await detectClashes(supabaseAdmin(), slots, ignoreIds);
  return NextResponse.json({ clashes });
}
