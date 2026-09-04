import { NextResponse } from "next/server";
import { rateLimit, clientKey } from "@/lib/ratelimit";
import { aiChat, aiConfigured } from "@/lib/ai";
import { PACKAGES, packageRate } from "@/lib/packages";
import { fmtNgn } from "@/lib/pricing";

// Public help chatbot for the marketing site. Answers questions about D-Maths
// using a tightly-scoped system prompt, rate-limited per IP. No auth — but it
// only ever talks about D-Maths and points people to WhatsApp for anything it
// can't handle.
export const dynamic = "force-dynamic";
export const maxDuration = 30;

const WHATSAPP = "https://wa.me/2347025674894";

function knowledge(): string {
  const tiers = PACKAGES.map(p => `- ${p.name}: ${p.tagline}. ${fmtNgn(packageRate(p))}/hour.`).join("\n");
  return `You are the friendly assistant for D-Maths Tuition (also styled "D-Maths Academy"), a fully online tuition service for learners across Nigeria and beyond.

Facts you can rely on:
- Subjects: Mathematics, English, Sciences and Coding (Python, web, beginner A.I).
- Exam preparation: WAEC, JAMB, NECO, BECE, IGCSE, SAT, A-Levels, and KS2/KS3.
- Enrolment packages (chosen at registration):
${tiers}
- Tuition is charged PER HOUR and billed monthly from the hours the learner actually attends. The invoice is sent to the parent about 3 days before month-end and is due on or before the last day of the month. Payment is made securely from the portal.
- There is no payment at sign-up. After a parent registers a child and it's approved, the learner gets a portal login and a short aptitude test (per subject/topic, pitched to their target exam) so teaching starts at the right level.
- Classes are live and online — never pre-recorded. Learners get a portal with classes, assignments, grades, attendance, practice, games and progress tracking. Parents get their own view.
- To register: the "Enrol your child" / "Register" button (the /apply page). To sign in: "Portal Access" / the login page.
- Contact: support@dmaths.academy or WhatsApp ${WHATSAPP}. Fully online; centre based in Asaba, Delta State.

Rules:
- Be warm, concise and helpful. 1–4 short sentences. British/Nigerian spelling.
- Only answer about D-Maths. If asked something unrelated, gently steer back.
- Never invent prices, dates or policies beyond the facts above. If you're unsure or the person needs a human, tell them to tap "Chat on WhatsApp" or email support@dmaths.academy.
- Encourage registering when it's the natural next step.`;
}

export async function POST(req: Request) {
  if (!rateLimit(clientKey(req, "chat"), 12, 60_000)) {
    return NextResponse.json({ reply: "You're sending messages quickly — give it a few seconds and try again, or reach us on WhatsApp." }, { status: 200 });
  }

  const b = await req.json().catch(() => null);
  const history: { role: string; text: string }[] = Array.isArray(b?.history) ? b.history.slice(-6) : [];
  const message = String(b?.message ?? "").trim().slice(0, 800);
  if (!message) return NextResponse.json({ error: "Empty message." }, { status: 400 });

  if (!aiConfigured()) {
    return NextResponse.json({ reply: `I can't reach the assistant right now. Please tap "Chat on WhatsApp" or email support@dmaths.academy and our team will help.` });
  }

  // Fold a little history into the user turn (the shim is single-turn).
  const priorLines = history
    .filter(h => h && (h.role === "user" || h.role === "bot") && typeof h.text === "string")
    .map(h => `${h.role === "user" ? "Parent" : "Assistant"}: ${h.text}`)
    .join("\n");
  const user = `${priorLines ? priorLines + "\n" : ""}Parent: ${message}\nAssistant:`;

  try {
    const reply = await aiChat({ system: knowledge(), user, maxTokens: 320 });
    return NextResponse.json({ reply: reply.trim() || "Happy to help — could you rephrase that?" });
  } catch {
    return NextResponse.json({ reply: `I couldn't answer that just now. Please tap "Chat on WhatsApp" or email support@dmaths.academy and we'll help you personally.` });
  }
}
