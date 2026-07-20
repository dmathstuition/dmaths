import { Icon, type IconName } from "@/components/Icons";

// A crisp, self-contained mock of the learner portal shown inside a phone
// frame — used on the landing & summer-camp pages to demonstrate the app.
// Built in markup (not a bitmap) so it stays sharp on every screen and
// always matches the real portal's look.

function Stat({ icon, value, label, tint }: { icon: IconName; value: string; label: string; tint: string }) {
  return (
    <div className="rounded-xl bg-white p-2 shadow-[0_1px_3px_rgba(15,58,107,.06)] ring-1 ring-line/60">
      <span className={`flex h-5 w-5 items-center justify-center rounded-md ${tint}`}>
        <Icon name={icon} className="h-3 w-3" />
      </span>
      <p className="mt-1.5 font-display text-[15px] font-bold leading-none text-ink">{value}</p>
      <p className="mt-0.5 text-[7px] font-bold uppercase tracking-wide text-ink/40">{label}</p>
    </div>
  );
}

function TabIcon({ icon, active }: { icon: IconName; active?: boolean }) {
  return (
    <span className={active ? "text-gold-deep" : "text-ink/30"}>
      <Icon name={icon} className="h-4 w-4" />
    </span>
  );
}

export default function PortalPhone({ className = "" }: { className?: string }) {
  return (
    <div className={`relative mx-auto w-[248px] ${className}`}>
      {/* soft brand glow behind the device */}
      <div aria-hidden className="pointer-events-none absolute -inset-6 -z-10 rounded-[3rem] bg-gradient-to-b from-gold/25 via-ink/10 to-transparent blur-2xl" />

      {/* device frame */}
      <div className="rounded-[2.6rem] bg-[#0c0c0e] p-2 shadow-[0_30px_60px_-15px_rgba(10,42,79,.55)] ring-1 ring-white/10">
        <div className="relative overflow-hidden rounded-[2.1rem] bg-chalk">
          {/* notch */}
          <div aria-hidden className="absolute left-1/2 top-1.5 z-20 h-4 w-20 -translate-x-1/2 rounded-full bg-[#0c0c0e]" />

          {/* status bar */}
          <div className="flex items-center justify-between px-5 pb-1 pt-2.5 text-[9px] font-bold text-ink/70">
            <span>9:41</span>
            <span className="flex items-center gap-1 text-ink/50">
              <Icon name="radio" className="h-2.5 w-2.5" />
              <span className="inline-block h-2 w-3.5 rounded-[2px] border border-ink/40" />
            </span>
          </div>

          {/* screen body */}
          <div className="space-y-2.5 px-3 pb-16 pt-1">
            {/* board hero */}
            <div className="boardgrid relative overflow-hidden rounded-2xl p-3.5 text-white"
              style={{ background: "linear-gradient(135deg, #10406F 0%, #0A2A4F 60%, #071C36 100%)" }}>
              <div aria-hidden className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full"
                style={{ background: "radial-gradient(circle, rgba(239,174,86,.45), transparent 70%)" }} />
              <span className="inline-flex items-center gap-1 rounded-full bg-gold px-2 py-0.5 text-[7px] font-extrabold uppercase tracking-wide text-board">
                <Icon name="graduationCap" className="h-2.5 w-2.5" /> SSS 2
              </span>
              <p className="mt-2 font-display text-[15px] font-bold leading-tight">
                Welcome back, <span className="text-gold">Amara</span>!
              </p>
              <p className="mt-0.5 font-mono text-[8px] text-white/55">ID: DM-2451</p>
              <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-gold/15 px-2 py-0.5 text-[8px] font-bold text-gold ring-1 ring-gold/30">
                <Icon name="zap" className="h-2.5 w-2.5" /> 12-day streak
              </span>
            </div>

            {/* stat row */}
            <div className="grid grid-cols-3 gap-1.5">
              <Stat icon="progress" value="92%" label="Avg score" tint="bg-emerald-50 text-emerald-600" />
              <Stat icon="calendar" value="96%" label="Attend." tint="bg-ink/10 text-ink" />
              <Stat icon="trophy" value="+340" label="Points" tint="bg-gold-pale text-gold-deep" />
            </div>

            {/* next class card */}
            <div className="rounded-xl bg-white p-2.5 shadow-[0_1px_3px_rgba(15,58,107,.06)] ring-1 ring-line/60">
              <p className="text-[8px] font-extrabold uppercase tracking-wide text-ink/35">Next class</p>
              <div className="mt-1.5 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-[11px] font-bold text-ink">Calculus — Integrals</p>
                  <p className="text-[8px] text-ink/45">Today · 4:00 PM</p>
                </div>
                <span className="flex-shrink-0 rounded-full bg-gradient-to-r from-gold to-gold-deep px-2.5 py-1 text-[8px] font-extrabold text-white">
                  Join
                </span>
              </div>
            </div>

            {/* assignment progress */}
            <div className="rounded-xl bg-white p-2.5 shadow-[0_1px_3px_rgba(15,58,107,.06)] ring-1 ring-line/60">
              <div className="flex items-center justify-between">
                <p className="text-[9px] font-bold text-ink/70">Weekly goal</p>
                <p className="text-[8px] font-bold text-gold-deep">4 / 5 tasks</p>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-line">
                <div className="h-full rounded-full bg-gradient-to-r from-gold to-gold-deep" style={{ width: "80%" }} />
              </div>
            </div>
          </div>

          {/* bottom tab bar */}
          <div className="absolute inset-x-0 bottom-0 flex items-center justify-around border-t border-line/70 bg-white/95 px-2 pb-3 pt-2 backdrop-blur">
            <TabIcon icon="home" active />
            <TabIcon icon="book" />
            <TabIcon icon="progress" />
            <TabIcon icon="messages" />
            <TabIcon icon="profile" />
          </div>
        </div>
      </div>
    </div>
  );
}
