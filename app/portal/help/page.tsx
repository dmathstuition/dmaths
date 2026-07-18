import Link from "next/link";
import Reveal from "@/components/landing/Reveal";
import { Icon, type IconName } from "@/components/Icons";

export const dynamic = "force-dynamic";
export const metadata = { title: "Help & Support — D-Maths" };

// Quick-answer FAQ shown inside the portal. Kept in sync with the public
// /help page but framed for a signed-in learner.
const FAQ: { q: string; a: React.ReactNode }[] = [
  {
    q: "How do I join my class?",
    a: (
      <>
        Open <Link href="/portal/classes" className="font-semibold text-gold-deep underline">My classes</Link>{" "}
        — each upcoming session shows a <strong>Join</strong> button when it&apos;s time. Online links open in the
        room; in-person classes show the venue instead. If you join more than 10 minutes late you&apos;ll be marked late.
      </>
    ),
  },
  {
    q: "Where are my assignments and grades?",
    a: (
      <>
        Tasks set for you appear under{" "}
        <Link href="/portal/assignments" className="font-semibold text-gold-deep underline">Assignments</Link>, and your
        scores and trend live under{" "}
        <Link href="/portal/progress" className="font-semibold text-gold-deep underline">My progress</Link>. Submit early
        so your tutor has time to give feedback.
      </>
    ),
  },
  {
    q: "How do I turn class reminders on?",
    a: (
      <>
        Go to your{" "}
        <Link href="/portal/profile" className="font-semibold text-gold-deep underline">Profile</Link> and use{" "}
        <strong>Notifications</strong> to allow alerts. You&apos;ll then get class reminders, new grades and messages —
        even when the app is closed. You can turn them off any time from your device settings.
      </>
    ),
  },
  {
    q: "I forgot my password",
    a: (
      <>
        You can set a new one from{" "}
        <Link href="/portal/profile" className="font-semibold text-gold-deep underline">Profile → Change password</Link>{" "}
        while signed in. If you&apos;re locked out, tap <strong>&quot;Forgot password?&quot;</strong> on the sign-in page,
        or message us and we&apos;ll reset it.
      </>
    ),
  },
  {
    q: "How do I pay my monthly tuition?",
    a: (
      <>
        Pay by transfer to <strong>Opay 7025674894</strong> or <strong>Access Bank 1534530227</strong> using your full
        name as the reference, then message us so we can confirm it. Your dashboard shows a reminder when a payment is
        due.
      </>
    ),
  },
  {
    q: "Can my parent see my progress?",
    a: (
      <>
        Yes — if a guardian email was provided, they get their own parent portal to view your grades, attendance and
        behaviour. Don&apos;t have it set up yet? Just ask us below.
      </>
    ),
  },
];

function Channel({ icon, title, detail, href, external }: {
  icon: IconName; title: string; detail: string; href: string; external?: boolean;
}) {
  const inner = (
    <>
      <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-gold-pale text-gold-deep">
        <Icon name={icon} className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <p className="font-display text-sm font-bold text-ink">{title}</p>
        <p className="truncate text-[13px] text-ink/55">{detail}</p>
      </div>
    </>
  );
  const cls = "card neu-card card-interactive flex items-center gap-4 p-4";
  return external ? (
    <a href={href} target="_blank" rel="noopener noreferrer" className={cls}>{inner}</a>
  ) : (
    <Link href={href} className={cls}>{inner}</Link>
  );
}

export default function PortalHelpPage() {
  return (
    <div className="space-y-6">
      {/* Hero */}
      <Reveal>
        <div className="boardgrid relative overflow-hidden rounded-2xl bg-board p-7 text-white sm:p-9">
          <div className="pointer-events-none absolute right-6 top-6 opacity-15">
            <Icon name="helpCircle" className="h-24 w-24" />
          </div>
          <p className="pill-gold mb-3 inline-flex items-center gap-1.5">
            <Icon name="helpCircle" className="h-3.5 w-3.5" /> Help &amp; Support
          </p>
          <h1 className="font-display text-2xl font-semibold sm:text-3xl">We&apos;re here to help</h1>
          <p className="mt-2 max-w-md text-sm text-white/70">
            Quick answers below, or reach a real person on WhatsApp, email or the portal — usually within 24 hours.
          </p>
        </div>
      </Reveal>

      {/* Contact channels */}
      <Reveal delay={60}>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Channel icon="phone" title="WhatsApp us" detail="+234 70 2567 4894"
            href="https://wa.me/2347025674894" external />
          <Channel icon="mail" title="Email support" detail="dmathstuition@gmail.com"
            href="mailto:dmathstuition@gmail.com" external />
          <Channel icon="messages" title="Message your tutor" detail="Chat inside the portal"
            href="/portal/messages" />
        </div>
      </Reveal>

      {/* FAQ */}
      <Reveal delay={120}>
        <div className="card neu-card p-6">
          <h2 className="mb-4 font-display text-lg font-semibold">Frequently asked</h2>
          <div className="divide-y divide-line/60">
            {FAQ.map((f, i) => (
              <details key={i} className="group py-3">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-semibold text-ink">
                  {f.q}
                  <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-chalk text-ink/50 transition group-open:rotate-45">
                    <Icon name="plusSquare" className="h-4 w-4" />
                  </span>
                </summary>
                <p className="mt-2 pr-9 text-[13px] leading-relaxed text-ink/65">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </Reveal>

      {/* Footer links */}
      <Reveal delay={160}>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 px-1 text-[13px] text-ink/50">
          <Link href="/help" className="font-semibold text-gold-deep hover:underline">Full FAQ</Link>
          <Link href="/privacy" className="hover:text-ink/70">Privacy policy</Link>
          <Link href="/terms" className="hover:text-ink/70">Terms</Link>
          <Link href="/refunds" className="hover:text-ink/70">Payment &amp; refunds</Link>
        </div>
      </Reveal>
    </div>
  );
}
