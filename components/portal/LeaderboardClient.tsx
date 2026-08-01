"use client";
import { useEffect, useMemo, useState } from "react";
import { Icon } from "@/components/Icons";
import Reveal from "@/components/landing/Reveal";
import CountUp from "@/components/landing/CountUp";
import Confetti from "@/components/ui/Confetti";
import Mascot from "@/components/Mascot";
import { learnerAvatar } from "@/lib/avatars";

type Winner = {
  id: string; first_name: string | null; last_name: string | null;
  reward_points: number; level: string | null; subjects: string[] | null;
};
type Scope = "overall" | "class" | "program";

function fullName(s: Winner) {
  // First name, plus a last initial to tell two "Tobi"s apart.
  const f = (s.first_name ?? "").trim();
  const li = s.last_name?.trim()?.[0];
  return (f + (li ? ` ${li.toUpperCase()}.` : "")).trim() || "Student";
}
function initials(s: Winner) {
  return `${s.first_name?.[0] ?? ""}${s.last_name?.[0] ?? ""}`.toUpperCase() || "S";
}

const MEDAL_TINT = ["text-[#EFAE56]", "text-[#AEB6C4]", "text-[#B87333]"]; // gold · silver · bronze
// Podium theming by place — gold / silver / bronze arena furniture.
const PLACE = [
  { grad: "from-[#F4C078] via-[#EFAE56] to-[#C8881F]", glow: "shadow-[0_0_46px_-8px_rgba(239,174,86,.9)]", ring: "ring-gold/60", bar: "from-[#EFAE56] to-[#C8881F]", h: 128, badge: "#EFAE56" },
  { grad: "from-[#D8DEE9] via-[#AEB6C4] to-[#7C8698]", glow: "shadow-[0_0_38px_-12px_rgba(174,182,196,.8)]", ring: "ring-slate-300/60", bar: "from-[#C6CDD9] to-[#7C8698]", h: 92, badge: "#AEB6C4" },
  { grad: "from-[#E0A46B] via-[#B87333] to-[#8A5626]", glow: "shadow-[0_0_34px_-12px_rgba(184,115,51,.8)]", ring: "ring-[#B87333]/60", bar: "from-[#C88A4E] to-[#8A5626]", h: 68, badge: "#B87333" },
];

// A circular podium/list avatar: the learner's mascot with an initials fallback.
function AvatarBubble({ s, size, ring }: { s: Winner; size: number; ring?: string }) {
  const px = { width: size, height: size };
  return (
    <span className={`relative inline-flex flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-ink to-board font-display font-bold text-gold-soft shadow-lift ${ring ?? ""}`}
      style={px}>
      <span className="absolute inset-0 flex items-center justify-center" aria-hidden>{initials(s)}</span>
      <Mascot src={learnerAvatar(s.id)} alt="" className="relative h-full w-full object-cover object-top" fallback={null} />
    </span>
  );
}

export default function LeaderboardClient({
  meId, myLevel, mySubjects, winners, levels, subjects,
}: {
  meId: string; myLevel: string; mySubjects: string[];
  winners: Winner[]; levels: string[]; subjects: string[];
}) {
  const [scope, setScope] = useState<Scope>("overall");
  // default the pickers to the learner's own class/program where possible
  const [level, setLevel] = useState(() => (levels.includes(myLevel) ? myLevel : levels[0] ?? ""));
  const [subject, setSubject] = useState(() => {
    const mine = mySubjects.find(s => subjects.includes(s));
    return mine ?? subjects[0] ?? "";
  });
  const [mounted, setMounted] = useState(false);
  const [celebrate, setCelebrate] = useState(0);
  useEffect(() => { const t = setTimeout(() => setMounted(true), 60); return () => clearTimeout(t); }, []);

  const list = useMemo(() => {
    if (scope === "class") return winners.filter(w => w.level === level);
    if (scope === "program") return winners.filter(w => (w.subjects ?? []).includes(subject));
    return winners;
  }, [scope, level, subject, winners]);

  const myRank = list.findIndex(s => s.id === meId) + 1;
  const myPts = list.find(s => s.id === meId)?.reward_points ?? 0;
  // The learner directly ahead — a target to chase.
  const ahead = myRank > 1 ? list[myRank - 2] : null;
  const gap = ahead ? ahead.reward_points - myPts : 0;

  // Show only the top 10 (myRank above still uses the full list, so a learner
  // outside the top 10 can still see their own position).
  const top = list.slice(0, 10);
  const podium = top.slice(0, 3);
  const rest = top.slice(3);
  const podiumOrder = [podium[1], podium[0], podium[2]]; // silver · gold · bronze

  // Celebrate on entry if the learner is on the podium — and re-fire on tap.
  useEffect(() => {
    if (mounted && myRank >= 1 && myRank <= 3) setCelebrate(c => c + 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, scope]);

  const scopeTabs: { id: Scope; label: string; icon: any }[] = [
    { id: "overall", label: "Overall", icon: "students" },
    { id: "class", label: "My class", icon: "graduationCap" },
    { id: "program", label: "My program", icon: "curriculum" },
  ];

  const scopeName =
    scope === "class" ? (level || "your class")
    : scope === "program" ? (subject || "your program")
    : "the whole academy";

  return (
    <div className="space-y-6">
      {/* confetti — rains over the page when a podium finisher is viewing */}
      <div className="pointer-events-none fixed inset-0 z-[60]"><Confetti fire={celebrate > 0} key={celebrate} pieces={52} /></div>

      {/* ── Header HUD ───────────────────────────────────────────── */}
      <div className="boardgrid relative overflow-hidden rounded-2xl bg-board p-7 text-white">
        <div aria-hidden className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full"
          style={{ background: "radial-gradient(circle, rgba(239,174,86,.4), transparent 70%)" }} />
        <div aria-hidden className="pointer-events-none absolute right-6 top-6 text-gold/30 float"><Icon name="trophy" className="h-6 w-6" /></div>
        <div aria-hidden className="pointer-events-none absolute right-24 bottom-6 text-gold/25 float" style={{ animationDelay: "1.1s" }}><Icon name="sparkles" className="h-5 w-5" /></div>
        <div className="relative flex items-center gap-4">
          <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-gold/15 text-gold ring-1 ring-gold/25">
            <Icon name="trophy" className="h-6 w-6" />
          </span>
          <div>
            <h1 className="font-display text-2xl font-semibold sm:text-3xl">Leaderboard</h1>
            <p className="mt-1 text-sm text-white/50">Top students by reward points across {scopeName}.</p>
          </div>
        </div>
      </div>

      {/* scope filter */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="grid flex-1 grid-cols-3 gap-2">
          {scopeTabs.map(t => (
            <button key={t.id} onClick={() => setScope(t.id)}
              className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold transition ${
                scope === t.id ? "border-gold bg-gold-pale text-gold-deep" : "border-line bg-white text-ink/55 hover:bg-chalk"}`}>
              <Icon name={t.icon} className="h-4 w-4" /> <span className="truncate">{t.label}</span>
            </button>
          ))}
        </div>
        {scope === "class" && levels.length > 0 && (
          <select className="field sm:max-w-[200px]" value={level} onChange={e => setLevel(e.target.value)}>
            {levels.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
        )}
        {scope === "program" && subjects.length > 0 && (
          <select className="field sm:max-w-[200px]" value={subject} onChange={e => setSubject(e.target.value)}>
            {subjects.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        )}
      </div>

      {/* your position */}
      {myRank > 0 && (
        <div className="card flex flex-wrap items-center gap-x-4 gap-y-2 p-4">
          <span className="font-display text-3xl font-bold text-gold-deep">#{myRank}</span>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-ink">Your position <span className="text-ink/40">· {scopeName}</span></p>
            <p className="inline-flex items-center gap-1 text-xs text-ink/40"><Icon name="coins" className="h-3.5 w-3.5 text-gold-deep" /> {myPts} reward pts</p>
          </div>
          {ahead && gap > 0 && (
            <p className="inline-flex items-center gap-1.5 rounded-full bg-gold-pale px-3 py-1.5 text-[12px] font-bold text-gold-deep">
              <Icon name="target" className="h-3.5 w-3.5" /> {gap} pts to overtake {fullName(ahead)}
            </p>
          )}
          {myRank === 1 && (
            <p className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-[12px] font-bold text-emerald-600"><Icon name="crown" className="h-3.5 w-3.5 text-gold-deep" /> You&apos;re #1 — defend it!</p>
          )}
        </div>
      )}

      {/* ── Champion arena (podium) ─────────────────────────────── */}
      {podium.length >= 3 && (
        <div onClick={() => setCelebrate(c => c + 1)}
          className="relative cursor-pointer overflow-hidden rounded-3xl px-3 pt-8 pb-0 sm:px-8"
          style={{ background: "linear-gradient(135deg, #10406F 0%, #0A2A4F 55%, #071C36 100%)" }}
          title="Tap to celebrate 🎉">
          <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-40 opacity-70"
            style={{ background: "radial-gradient(60% 90% at 50% 0%, rgba(239,174,86,.25), transparent 70%)" }} />
          <p className="relative mb-2 text-center text-[11px] font-extrabold uppercase tracking-[.25em] text-gold/70">Champions</p>

          <div className="relative grid grid-cols-3 items-end gap-2 sm:gap-4">
            {podiumOrder.map((s, col) => {
              if (!s) return <div key={col} />;
              const place = list.indexOf(s);          // 0 = gold, 1 = silver, 2 = bronze
              const p = PLACE[place];
              const isMe = s.id === meId;
              return (
                <div key={s.id} className="flex flex-col items-center">
                  {/* crown on the champion */}
                  {place === 0 && <span className="mb-0.5 badge-pulse text-gold"><Icon name="crown" className="h-6 w-6" /></span>}
                  {/* avatar with glowing ring + medal badge */}
                  <div className={`relative transition-all duration-500 ${mounted ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"}`}>
                    <span aria-hidden className={`absolute inset-0 -z-10 rounded-full ${p.glow}`} />
                    <div className="float">
                      <AvatarBubble s={s} size={place === 0 ? 76 : 60} ring={`ring-2 ${p.ring} ${isMe ? "ring-offset-2 ring-offset-board" : ""}`} />
                    </div>
                    <span className={`absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-board ring-1 ring-white/20 ${MEDAL_TINT[place]}`}><Icon name="medal" className="h-3.5 w-3.5" /></span>
                  </div>

                  <p className="mt-2 line-clamp-1 max-w-full text-center text-[13px] font-bold text-white">{fullName(s)}</p>
                  {isMe && <span className="text-[10px] font-bold text-gold">(you)</span>}
                  <p className="inline-flex items-center gap-1 font-display text-base font-extrabold text-gold">
                    <Icon name="coins" className="h-4 w-4" /><CountUp to={s.reward_points} duration={1100} />
                  </p>

                  {/* pedestal — grows in on mount */}
                  <div className="mt-2 w-full overflow-hidden rounded-t-xl">
                    <div className={`mx-auto flex w-full items-start justify-center bg-gradient-to-b ${p.bar} transition-[height] duration-700 ease-out`}
                      style={{ height: mounted ? p.h : 0 }}>
                      <span className="mt-2 font-display text-2xl font-black text-white/90 drop-shadow sm:text-3xl">{place + 1}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Ranked list (4th onward, or all when < 3 on the podium) ─ */}
      <div className="card divide-y divide-line/60">
        {(podium.length >= 3 ? rest : list).map((student, idx) => {
          const rank = (podium.length >= 3 ? 3 : 0) + idx + 1;
          const isMe = student.id === meId;
          const isTop3 = rank <= 3;
          return (
            <div key={student.id}
              className={`group flex items-center gap-3 px-4 py-3 transition-colors sm:px-5 ${isMe ? "bg-gold/5" : "hover:bg-chalk/60"}`}>
              <span className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg text-center font-display text-sm font-bold ${
                isMe ? "bg-gold text-board" : "bg-ink/5 text-ink/45"}`}>
                {isTop3 ? <Icon name="medal" className={`h-4 w-4 ${isMe ? "" : MEDAL_TINT[rank - 1]}`} /> : rank}
              </span>
              <AvatarBubble s={student} size={38} ring={isMe ? "ring-2 ring-gold/50" : ""} />
              <p className={`flex-1 truncate font-semibold ${isMe ? "text-gold-deep" : "text-ink"}`}>
                {fullName(student)}
                {isMe && <span className="ml-2 text-xs font-normal text-ink/40">(you)</span>}
              </p>
              <span className="inline-flex flex-shrink-0 items-center gap-1 font-display text-base font-semibold text-emerald-600">
                <Icon name="coins" className="h-4 w-4" /> {student.reward_points}
              </span>
            </div>
          );
        })}
        {!list.length && (
          <p className="p-6 text-center text-sm text-ink/40">
            No ranked students in {scopeName} yet — earn reward points to appear here! 🏆
          </p>
        )}
      </div>
    </div>
  );
}
