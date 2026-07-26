import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireStaff } from "@/lib/authRole";
import { validateQuestion, normaliseQuestion, type BankQuestion } from "@/lib/questionBank";

// The CBT question bank. Staff only — a learner reading this table would have
// every answer, so there is no read path for them anywhere in the app.
//
// Admins manage the whole bank; a tutor may edit or delete only the questions
// they wrote, though they can read and reuse everyone's.
export const dynamic = "force-dynamic";

const explain = (m: string) =>
  /relation .*question_bank/i.test(m)
    ? "The question bank needs migration-question-bank.sql — run it in Supabase."
    : m;

async function owns(admin: ReturnType<typeof supabaseAdmin>, staff: { id: string; role: string }, id: string) {
  if (staff.role === "admin") return true;
  const { data } = await admin.from("question_bank").select("owner_id").eq("id", id).maybeSingle();
  return data?.owner_id === staff.id;
}

// GET — browse, filtered. Returns rows in the shape the CBT builder expects.
export async function GET(req: Request) {
  const staff = await requireStaff();
  if (!staff) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const url = new URL(req.url);
  const subject = url.searchParams.get("subject")?.trim() ?? "";
  const level = url.searchParams.get("level")?.trim() ?? "";
  const topic = url.searchParams.get("topic")?.trim() ?? "";
  const limit = Math.min(500, Math.max(1, Number(url.searchParams.get("limit")) || 200));

  let q = supabaseAdmin()
    .from("question_bank")
    .select("id, subject, level, topic, question, code, options, answer, owner_id, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (subject) q = q.eq("subject", subject);
  if (level) q = q.eq("level", level);
  if (topic) q = q.ilike("topic", `%${topic}%`);

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: explain(error.message), questions: [] }, { status: 200 });
  return NextResponse.json({ questions: data ?? [] });
}

// POST — save one question, or a whole batch straight from the CBT builder.
export async function POST(req: Request) {
  const staff = await requireStaff();
  if (!staff) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const b = await req.json().catch(() => null);
  const subject = String(b?.subject ?? "").trim().slice(0, 80);
  const level = String(b?.level ?? "").trim().slice(0, 40);
  const topic = String(b?.topic ?? "").trim().slice(0, 80);

  const incoming: Partial<BankQuestion>[] = Array.isArray(b?.questions)
    ? b.questions
    : b?.question ? [b as Partial<BankQuestion>] : [];
  if (!incoming.length) return NextResponse.json({ error: "Nothing to save." }, { status: 400 });

  // Validate the lot before writing any of it — a half-saved batch is worse
  // than a rejected one.
  for (const q of incoming) {
    const problem = validateQuestion(q);
    if (problem) return NextResponse.json({ error: problem }, { status: 400 });
  }

  const rows = incoming.map((q) => ({
    ...normaliseQuestion(q),
    subject, level, topic,
    owner_id: staff.id,
  }));

  const { data, error } = await supabaseAdmin().from("question_bank").insert(rows).select("id");
  if (error) return NextResponse.json({ error: explain(error.message) }, { status: 500 });
  return NextResponse.json({ ok: true, saved: data?.length ?? rows.length });
}

// PATCH — edit one question you own.
export async function PATCH(req: Request) {
  const staff = await requireStaff();
  if (!staff) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const b = await req.json().catch(() => null);
  const id = String(b?.id ?? "");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const admin = supabaseAdmin();
  if (!(await owns(admin, staff, id))) {
    return NextResponse.json({ error: "That question isn't yours." }, { status: 403 });
  }

  const problem = validateQuestion(b);
  if (problem) return NextResponse.json({ error: problem }, { status: 400 });

  const { error } = await admin.from("question_bank").update({
    ...normaliseQuestion(b),
    subject: String(b?.subject ?? "").trim().slice(0, 80),
    level: String(b?.level ?? "").trim().slice(0, 40),
    topic: String(b?.topic ?? "").trim().slice(0, 80),
  }).eq("id", id);
  if (error) return NextResponse.json({ error: explain(error.message) }, { status: 500 });
  return NextResponse.json({ ok: true });
}

// DELETE — remove one question you own. Tests already built keep their own copy.
export async function DELETE(req: Request) {
  const staff = await requireStaff();
  if (!staff) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const id = new URL(req.url).searchParams.get("id") ?? "";
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const admin = supabaseAdmin();
  if (!(await owns(admin, staff, id))) {
    return NextResponse.json({ error: "That question isn't yours." }, { status: 403 });
  }

  const { error } = await admin.from("question_bank").delete().eq("id", id);
  if (error) return NextResponse.json({ error: explain(error.message) }, { status: 500 });
  return NextResponse.json({ ok: true });
}
