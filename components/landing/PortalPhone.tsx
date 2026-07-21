import { Icon, type IconName } from "@/components/Icons";

// A crisp, self-contained mock of the learner portal shown inside a phone
// frame — used on the landing & summer-camp pages to demonstrate the app.
// Built in markup (not a bitmap) so it stays sharp on every screen and
// mirrors the real portal dashboard (blue header, board welcome card, stat
// cards, 6-tab bar). Demo identity + populated figures on purpose.

function StatCard({ icon, value, label, tint }: { icon: IconName; value: string; label: string; tint: string }) {
  return (
    <div className="rounded-xl bg-white p-2.5 shadow-[0_1px_3px_rgba(15,58,107,.06)] ring-1 ring-line/60">
      <span className={`flex h-6 w-6 items-center justify-center rounded-lg ${tint}`}>
        <Icon name={icon} className="h-3.5 w-3.5" />
      </span>
      <p className="mt-1.5 font-display text-xl font-bold leading-none text-ink">{value}</p>
      <p className="mt-1 text-[7px] font-extrabold uppercase tracking-wide text-ink/40">{label}</p>
    </div>
  );
}

function Tab({ icon, label, active }: { icon: IconName; label: string; active?: boolean }) {
  return (
    <span className={`flex flex-col items-center gap-0.5 ${active ? "text-gold-deep" : "text-ink/30"}`}>
      <Icon name={icon} className="h-3.5 w-3.5" />
      <span className="text-[6px] font-bold">{label}</span>
    </span>
  );
}

export default function PortalPhone({ className = "" }: { className?: string }) {
  return (
    <div className={`doc-light relative mx-auto w-[250px] ${className}`}>
      {/* soft brand glow behind the device */}
      <div aria-hidden className="pointer-events-none absolute -inset-6 -z-10 rounded-[3rem] bg-gradient-to-b from-gold/25 via-ink/10 to-transparent blur-2xl" />

      {/* device frame */}
      <div className="rounded-[2.6rem] bg-[#0c0c0e] p-2 shadow-[0_30px_60px_-15px_rgba(10,42,79,.55)] ring-1 ring-white/10">
        <div className="relative overflow-hidden rounded-[2.1rem] bg-chalk">
          {/* blue header region (status bar + greeting), matching the real app */}
          <div style={{ background: "linear-gradient(180deg, #1A60AB 0%, #16548F 100%)" }}>
            {/* status bar */}
            <div className="flex items-center justify-between px-4 pt-2.5 text-[8px] font-bold text-white/90">
              <span>5:22</span>
              <span className="flex items-center gap-1 text-white/80">
                <Icon name="radio" className="h-2.5 w-2.5" />
                <span className="inline-flex h-2.5 w-4 items-center justify-center rounded-[3px] border border-white/60 text-[5px]">34</span>
              </span>
            </div>
            {/* greeting */}
            <div className="flex items-center justify-between px-4 pb-3 pt-2">
              <div>
                <p className="text-[8px] font-semibold text-white/55">Good morning 👋</p>
                <p className="font-display text-sm font-bold leading-tight text-white">Amara</p>
              </div>
              <div className="flex items-center gap-1.5 text-white/70">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/15"><Icon name="compass" className="h-3 w-3" /></span>
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/15"><Icon name="bell" className="h-3 w-3" /></span>
              </div>
            </div>
          </div>

          {/* body */}
          <div className="space-y-2.5 px-3 pb-14 pt-3">
            {/* board welcome card */}
            <div className="boardgrid relative overflow-hidden rounded-2xl p-3.5 text-white"
              style={{ background: "linear-gradient(135deg, #10406F 0%, #0A2A4F 60%, #071C36 100%)" }}>
              {/* gold diagonal + robot + faint maths, like the real hero */}
              <div aria-hidden className="pointer-events-none absolute -right-8 top-1/2 h-px w-40 -rotate-45 bg-gold/40" />
              <div aria-hidden className="pointer-events-none absolute right-2.5 top-2.5 text-base">🤖</div>
              <div aria-hidden className="pointer-events-none absolute right-10 top-10 font-display text-[11px] font-bold text-gold/60">π</div>
              <div aria-hidden className="pointer-events-none absolute bottom-4 right-6 font-display text-[10px] font-bold text-white/25">√</div>
              <span className="inline-flex items-center gap-1 rounded-full bg-gold px-2 py-0.5 text-[7px] font-extrabold uppercase tracking-wide text-board">
                <Icon name="graduationCap" className="h-2.5 w-2.5" /> Post Secondary
              </span>
              <p className="mt-2 font-display text-[15px] font-bold leading-tight">
                Welcome back, <span className="text-gold">Amara</span>!
              </p>
              <p className="mt-0.5 font-mono text-[8px] text-white/55">ID: DM-2026-0142</p>
              <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-gold/15 px-2 py-0.5 text-[8px] font-bold text-gold ring-1 ring-gold/30">
                🔥 12-day learning streak
              </span>
              <div className="mt-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5 text-[8px] font-bold text-white ring-1 ring-white/15">
                  🎁 Refer a friend
                </span>
              </div>
              <p className="mt-2 text-[8px] leading-relaxed text-white/80">💡 Review your graded work — that&apos;s where the biggest gains hide. 📈</p>
            </div>

            {/* stat cards */}
            <div className="grid grid-cols-3 gap-1.5">
              <StatCard icon="classes" value="2" label="Classes" tint="bg-ink/10 text-ink" />
              <StatCard icon="progress" value="92%" label="Avg score" tint="bg-emerald-50 text-emerald-600" />
              <StatCard icon="trophy" value="+340" label="Points" tint="bg-gold-pale text-gold-deep" />
            </div>

            {/* next class */}
            <div className="rounded-xl bg-white p-2.5 shadow-[0_1px_3px_rgba(15,58,107,.06)] ring-1 ring-line/60">
              <p className="text-[7px] font-extrabold uppercase tracking-wide text-ink/35">Next class</p>
              <div className="mt-1 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-[10px] font-bold text-ink">Calculus — Integrals</p>
                  <p className="text-[8px] text-ink/45">Today · 4:00 PM</p>
                </div>
                <span className="flex-shrink-0 rounded-full bg-gradient-to-r from-gold to-gold-deep px-2.5 py-1 text-[8px] font-extrabold text-white">Join</span>
              </div>
            </div>
          </div>

          {/* 6-item bottom tab bar (matches the real app) */}
          <div className="absolute inset-x-0 bottom-0 flex items-center justify-around border-t border-line/70 bg-white/95 px-1.5 pb-2.5 pt-1.5 backdrop-blur">
            <Tab icon="home" label="Home" active />
            <Tab icon="book" label="Learn" />
            <Tab icon="progress" label="Progress" />
            <Tab icon="messages" label="Messages" />
            <Tab icon="profile" label="Profile" />
            <Tab icon="grid" label="More" />
          </div>
        </div>
      </div>
    </div>
  );
}
