// ── D-MATHS FAQ — single source of truth ─────────────────────────────
// Used by the /help page, the site chatbot's quick-question buttons, and the
// chatbot's AI knowledge, so the answers are consistent everywhere. Plain text
// (no markup) so it works in every surface. Edit here and all three update.

export type Faq = { id: string; q: string; a: string };

export const FAQS: Faq[] = [
  {
    id: "register",
    q: "How do I register my child?",
    a: "Tap “Register” (the Enrol button), fill in the student and guardian details, choose a package, and submit. There's no payment at sign-up. Once we approve it, the Student ID and password are emailed to you and our team reaches out to confirm.",
  },
  {
    id: "subjects",
    q: "What do you teach?",
    a: "Maths, English, Sciences and Coding (Python, web and beginner A.I), with exam preparation for WAEC, JAMB, IGCSE, SAT, A-Levels and KS2/KS3.",
  },
  {
    id: "ages",
    q: "What age groups do you cater for?",
    a: "Primary through senior secondary, including exam candidates, across the Nigerian and British curricula.",
  },
  {
    id: "pricing",
    q: "How much does it cost?",
    a: "Tuition is charged per hour, by package: Core subjects, KS2 & KS3 exam prep, and Core + Coding — each with its own hourly rate. See the Pricing page for the current rates.",
  },
  {
    id: "payment",
    q: "How does payment work?",
    a: "You're billed monthly for the hours your child actually attends. The invoice is sent to the parent about 3 days before month-end and is due on or before the last day of the month, paid securely from the portal.",
  },
  {
    id: "documents",
    q: "What documents do I need to register?",
    a: "None to get started — just the student's and guardian's basic details and contact information. We'll confirm everything with you after you submit.",
  },
  {
    id: "multiple",
    q: "Can I register more than one child?",
    a: "Yes — complete the registration once for each child. Every learner gets their own portal, and a parent can follow all of them.",
  },
  {
    id: "aptitude",
    q: "What is the aptitude test?",
    a: "After enrolment is approved, your child sits a short online aptitude test — split by subject and topic and pitched to their target exam — so we teach at just the right level. You pick a convenient time for it during registration.",
  },
  {
    id: "parents",
    q: "Can parents see their child's progress?",
    a: "Yes. If a guardian email is provided, a parent account is created so you can view grades, attendance, behaviour and reports. Ask us if you need access set up.",
  },
  {
    id: "classes",
    q: "When do classes start and how do I join?",
    a: "After enrolment is confirmed we send the schedule and joining links. Classes are delivered live online — upcoming sessions appear in the Classes section of the portal.",
  },
  {
    id: "password",
    q: "I forgot my password",
    a: "On the Sign in page tap “Forgot password?”, enter your email and follow the link we send. Students who only have a Student ID can ask us to reset it.",
  },
  {
    id: "receipt",
    q: "How do I get a receipt?",
    a: "A receipt is issued in the portal for every payment, and emailed when enrolment is approved. Need another copy? Contact us with your payment reference.",
  },
];

export const findFaq = (id: string) => FAQS.find((f) => f.id === id);
