import { getProfile } from "@/lib/auth";
import { siteBaseUrl } from "@/lib/siteUrl";
import ReferShare from "@/components/portal/ReferShare";
import Reveal from "@/components/landing/Reveal";

export const dynamic = "force-dynamic";

export default async function ReferPage() {
  const me = await getProfile();
  const code = (me as any)?.student_code as string | undefined;
  const count = (me as any)?.referral_count ?? 0;
  const link = code ? `${siteBaseUrl()}/apply?ref=${encodeURIComponent(code)}` : `${siteBaseUrl()}/apply`;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Reveal>
        <div className="boardgrid relative overflow-hidden rounded-2xl bg-gradient-to-br from-board to-boardDeep p-7 text-white sm:p-9">
          <div className="pointer-events-none absolute right-0 top-0 h-full w-1/2 opacity-20"
            style={{ background: "radial-gradient(circle at 80% 20%, #EFAE56, transparent 60%)" }} />
          <div className="relative">
            <p className="pill-gold mb-3">🎁 Refer a friend</p>
            <h1 className="font-display text-2xl font-semibold sm:text-3xl">
              Invite friends to <span className="text-gold">D-Maths</span>
            </h1>
            <p className="mt-2 max-w-md text-sm text-white/55">
              Share your personal link. When a friend enrols through it, we&apos;ll count it here —
              and let you know the moment they join.
            </p>
            <p className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-gold/15 px-3 py-1 text-sm font-bold text-gold ring-1 ring-gold/30">
              👥 {count} friend{count === 1 ? "" : "s"} joined
            </p>
          </div>
        </div>
      </Reveal>

      <Reveal delay={80}>
        <div className="card p-6">
          <h2 className="mb-1 font-display text-lg font-semibold">Your referral link</h2>
          <p className="mb-4 text-sm text-ink/50">
            Anyone who registers with this link is tagged as your referral.
          </p>
          <ReferShare link={link} />
        </div>
      </Reveal>

      <Reveal delay={140}>
        <div className="card p-6">
          <h2 className="mb-3 font-display text-lg font-semibold">How it works</h2>
          <ol className="space-y-3 text-sm text-ink/70">
            {[
              "Share your link with a friend or their parent.",
              "They tap it and complete the quick registration.",
              "Once we approve their enrolment, it shows up here — and you get a notification. 🎉",
            ].map((t, i) => (
              <li key={i} className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gold text-[13px] font-extrabold text-board">{i + 1}</span>
                <span>{t}</span>
              </li>
            ))}
          </ol>
        </div>
      </Reveal>
    </div>
  );
}
