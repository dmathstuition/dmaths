import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getUser } from "@/lib/auth";
import { notifyUser } from "@/lib/notify";

// A parent (linked to the learner) or an admin picks the time the learner will
// sit their aptitude test. Sets scheduled_at on an approved ("scheduled") test.
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Please sign in." }, { status: 401 });

  const b = await req.json().catch(() => null);
  const testId = String(b?.testId ?? "");
  const scheduledAt = new Date(String(b?.scheduledAt ?? ""));
  if (!testId || isNaN(scheduledAt.getTime())) return NextResponse.json({ error: "Pick a valid date and time." }, { status: 400 });
  if (scheduledAt.getTime() < Date.now() - 60_000) return NextResponse.json({ error: "Choose a time in the future." }, { status: 400 });

  const admin = supabaseAdmin();
  const { data: test } = await admin.from("aptitude_tests").select("id, student_id, status").eq("id", testId).maybeSingle();
  if (!test) return NextResponse.json({ error: "Test not found." }, { status: 404 });
  if (test.status !== "scheduled") return NextResponse.json({ error: "This test can't be scheduled right now." }, { status: 400 });

  // Authorise: an admin, or a parent linked to this learner.
  const { data: me } = await admin.from("profiles").select("role").eq("id", user.id).maybeSingle();
  let allowed = me?.role === "admin";
  if (!allowed) {
    const { data: link } = await admin.from("parent_student_links")
      .select("parent_id").eq("student_id", test.student_id).eq("parent_id", user.id).maybeSingle();
    allowed = !!link;
  }
  if (!allowed) return NextResponse.json({ error: "You can't schedule this test." }, { status: 403 });

  const { error } = await admin.from("aptitude_tests").update({ scheduled_at: scheduledAt.toISOString() }).eq("id", testId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await notifyUser(admin, test.student_id, {
    title: "🗓️ Your aptitude test is booked",
    body: `It's scheduled for ${scheduledAt.toLocaleString("en-NG", { timeZone: "Africa/Lagos", dateStyle: "medium", timeStyle: "short" })}. It'll open in your portal then.`,
    link: "/portal/aptitude",
  });
  return NextResponse.json({ ok: true, scheduledAt: scheduledAt.toISOString() });
}
