"use client";
import { useEffect, useMemo, useState } from "react";
import { Icon } from "@/components/Icons";
import Reveal from "@/components/landing/Reveal";
import CountUp from "@/components/landing/CountUp";
import Confetti from "@/components/ui/Confetti";
import Mascot from "@/components/Mascot";
import { learnerAvatarFor } from "@/lib/avatars";
import { titleLabel } from "@/lib/cosmetics";
import { tierFor } from "@/lib/vip";

type Winner = {
  id: string; first_name: string | null; last_name: string | null;
  reward_points: number; level: string | null; subjects: string[] | null;
  season_points?: number;
  avatar_choice?: string | null; avatar_title?: string | null;
};
type Scope = "overall" | "class" | "program";
type Mode = "all" | "season";
type Champion = { rank: number; name: string; points: number };

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
const PLACE_LABEL = ["1ST", "2ND", "3RD"];
// Podium theming by place — gold / silver / bronze arena furniture.
// `top` is the lighter 3D "step surface"; `bar` is the front face of the block.
const PLACE = [
  { glow: "shadow-[0_0_54px_-6px_rgba(239,174,86,.95)]", ring: "ring-gold/60", top: "from-[#FBE0AE] to-[#F4C078]", bar: "from-[#EFAE56] to-[#B4791A]", h: 156 },
  { glow: "shadow-[0_0_40px_-10px_rgba(174,182,196,.85)]", ring: "ring-slate-300/60", top: "from-[#EEF1F6] to-[#C6CDD9]", bar: "from-[#C6CDD9] to-[#6F7A8C]", h: 110 },
  { glow: "shadow-[0_0_36px_-10px_rgba(184,115,51,.85)]", ring: "ring-[#B87333]/60", top: "from-[#EAB988] to-[#C88A4E]", bar: "from-[#C88A4E] to-[#7C4D22]", h: 78 },
];

// A circular podium/list avatar: the learner's mascot with an initials fallback.
function AvatarBubble({ s, size, ring }: { s: Winner; size: number; ring?: string }) {
  const px = { width: size, height: size };
  return (
    <span className={`relative inline-flex flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-ink to-board font-display font-bold text-gold-soft shadow-lift ${ring ?? ""}`}
      style={px}>
      <span className="absolute inset-0 flex items-center justify-center" aria-hidden>{initials(s)}</span>
      <Mascot src={learnerAvatarFor(s.id, s.avatar_choice)} alt="" className="relative h-full w-full object-cover object-top" fallback={null} />
    </span>
  );
}

// The learner's equipped title (Avatar Studio) shown as a flex on the board —
// gold on white lists, a lighter frosted pill on the dark podium.
function TitleFlair({ s, tone = "gold" }: { s: Winner; tone?: "gold" | "light" }) {
  const label = titleLabel(s.avatar_title);
  if (!label) return null;
  return (
    <span className={`inline-flex flex-shrink-0 items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
      tone === "light" ? "bg-white/15 text-gold ring-1 ring-gold/25" : "bg-gold-pale text-gold-deep"}`}>
      <Icon name="star" className="h-2.5 w-2.5" /> {label}
    </span>
  );
}

// VIP tier gem — a lifetime-status flex (Silver and up; Bronze is the default,
// so it's left unmarked to keep the board clean).
function TierGem({ s }: { s: Winner }) {
  const t = tierFor(s.reward_points);
  if (t.key === "bronze") return null;
  return (
    <span title={`${t.name} VIP`} className="inline-flex flex-shrink-0" style={{ color: t.color }}>
      <Icon name="gem" className="h-3.5 w-3.5" />
    </span>
  );
}

export default function LeaderboardClient({
  meId, myLevel, mySubjects, winners, levels, subjects,
  seasonEnabled = false, seasonName = "", champions = [], hofLabel = "",
}: {
  meId: string; myLevel: string; mySubjects: string[];
  winners: Winner[]; levels: string[]; subjects: string[];
  seasonEnabled?: boolean; seasonName?: string; champions?: Champion[]; hofLabel?: string;
}) {
  const [scope, setScope] = useState<Scope>("overall");
  const [mode, setMode] = useState<Mode>("all");
  // default the pickers to the learner's own class/program where possible
  const [level, setLevel] = useState(() => (levels.includes(myLevel) ? myLevel : levels[0] ?? ""));
  const [subject, setSubject] = useState(() => {
    const mine = mySubjects.find(s => subjects.includes(s));
    return mine ?? subjects[0] ?? "";
  });
  const [mounted, setMounted] = useState(false);
  const [celebrate, setCelebrate] = useState(0);
  useEffect(() => { const t = setTimeout(() => setMounted(true), 60); return () => clearTimeout(t); }, []);

  // The metric a row is ranked & shown by — lifetime points, or this season's.
  const metric = (w: Winner) => (mode === "season" ? (w.season_points ?? 0) : w.reward_points);

  const list = useMemo(() => {
    let l = winners;
    if (scope === "class") l = l.filter(w => w.level === level);
    else if (scope === "program") l = l.filter(w => (w.subjects ?? []).includes(subject));
    if (mode === "season") l = l.filter(w => (w.season_points ?? 0) > 0);
    // Season mode re-ranks by this month's points; all-time arrives pre-sorted.
    return mode === "season" ? [...l].sort((a, b) => (b.season_points ?? 0) - (a.season_points ?? 0)) : l;
  }, [scope, level, subject, winners, mode]);

  const myRank = list.findIndex(s => s.id === meId) + 1;
  const myPts = list.find(s => s.id === meId) ? metric(list.find(s => s.id === meId)!) : 0;
  // The learner directly ahead — a target to chase.
  const ahead = myRank > 1 ? list[myRank - 2] : null;
  const gap = ahead ? metric(ahead) - myPts : 0;

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
  }, [mounted, scope, mode]);

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
            <p className="mt-1 text-sm text-white/50">
              {mode === "season"
                ? <>Top climbers this season across {scopeName}{seasonName ? ` · ${seasonName}` : ""}.</>
                : <>Top students by reward points across {scopeName}.</>}
            </p>
          </div>
        </div>
      </div>

      {/* all-time vs this-season toggle */}
      {seasonEnabled && (
        <div className="inline-flex rounded-xl border border-line bg-white p-1 text-sm font-bold">
          {([["all", "All-time"], ["season", "This month"]] as [Mode, string][]).map(([m, label]) => (
            <button key={m} onClick={() => setMode(m)}
              className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-1.5 transition ${mode === m ? "bg-gold text-board" : "text-ink/55 hover:text-ink"}`}>
              {m === "season" && <Icon name="flame" className="h-3.5 w-3.5" />}{label}
            </button>
          ))}
        </div>
      )}

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
            <p className="inline-flex items-center gap-1 text-xs text-ink/40"><Icon name="coins" className="h-3.5 w-3.5 text-gold-deep" /> {myPts} {mode === "season" ? "pts this month" : "reward pts"}</p>
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
          {/* stage spotlight + champion beam */}
          <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-56 opacity-80"
            style={{ background: "radial-gradient(55% 100% at 50% 0%, rgba(239,174,86,.28), transparent 70%)" }} />
          <div aria-hidden className="pointer-events-none absolute left-1/2 top-0 h-56 w-40 -translate-x-1/2 opacity-60 badge-pulse"
            style={{ background: "linear-gradient(to bottom, rgba(239,174,86,.30), transparent 80%)", clipPath: "polygon(38% 0, 62% 0, 100% 100%, 0 100%)" }} />
          {/* floating sparkles */}
          <div aria-hidden className="pointer-events-none absolute left-6 top-10 text-gold/25 float"><Icon name="sparkles" className="h-4 w-4" /></div>
          <div aria-hidden className="pointer-events-none absolute right-8 top-16 text-gold/20 float" style={{ animationDelay: "1.4s" }}><Icon name="star" className="h-3.5 w-3.5" /></div>

          <p className="relative mb-3 text-center text-[11px] font-extrabold uppercase tracking-[.3em] text-gold/80">Champions</p>

          <div className="relative grid grid-cols-3 items-end gap-2 sm:gap-4">
            {podiumOrder.map((s, col) => {
              if (!s) return <div key={col} />;
              const place = list.indexOf(s);          // 0 = gold, 1 = silver, 2 = bronze
              const p = PLACE[place];
              const isMe = s.id === meId;
              return (
                <div key={s.id} className="flex flex-col items-center">
                  {/* crown on the champion */}
                  {place === 0 && <span className="mb-1 badge-pulse text-gold drop-shadow"><Icon name="crown" className="h-7 w-7" /></span>}
                  {/* avatar with glowing ring + medal badge */}
                  <div className={`relative transition-all duration-500 ${mounted ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"}`}
                    style={{ transitionDelay: `${(2 - place) * 120}ms` }}>
                    <span aria-hidden className={`absolute inset-0 -z-10 rounded-full ${p.glow}`} />
                    <div className="float">
                      <AvatarBubble s={s} size={place === 0 ? 82 : 62} ring={`ring-2 ${p.ring} ${isMe ? "ring-offset-2 ring-offset-board" : ""}`} />
                    </div>
                    <span className={`absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-board ring-1 ring-white/20 ${MEDAL_TINT[place]}`}><Icon name="medal" className="h-3.5 w-3.5" /></span>
                  </div>

                  <p className="mt-2 line-clamp-1 max-w-full text-center text-[13px] font-bold text-white">{fullName(s)}</p>
                  <span className="mt-0.5 inline-flex items-center gap-1"><TierGem s={s} /><TitleFlair s={s} tone="light" /></span>
                  {isMe && <span className="text-[10px] font-bold text-gold">(you)</span>}
                  <p className="inline-flex items-center gap-1 font-display text-base font-extrabold text-gold">
                    <Icon name="coins" className="h-4 w-4" /><CountUp to={metric(s)} duration={1100} />
                  </p>

                  {/* pedestal — a 3D block that rises on mount */}
                  <div className="mt-3 w-full">
                    {/* lighter top "step" face */}
                    <div className={`mx-auto h-2.5 w-[94%] rounded-t-md bg-gradient-to-b ${p.top} shadow-[0_-1px_0_rgba(255,255,255,.4)_inset]`} />
                    {/* front face */}
                    <div className={`relative mx-auto flex w-full flex-col items-center justify-start overflow-hidden bg-gradient-to-b ${p.bar} shadow-[inset_0_2px_0_rgba(255,255,255,.28),inset_0_-14px_24px_-12px_rgba(0,0,0,.5),0_12px_28px_-12px_rgba(0,0,0,.55)] transition-[height] duration-700 ease-out`}
                      style={{ height: mounted ? p.h : 0, transitionDelay: `${(2 - place) * 120}ms` }}>
                      <span className="mt-1.5 text-[9px] font-extrabold uppercase tracking-widest text-white/70">{PLACE_LABEL[place]}</span>
                      <span className="font-display text-3xl font-black text-white/95 drop-shadow sm:text-4xl">{place + 1}</span>
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
              <div className="flex min-w-0 flex-1 items-center gap-2">
                <p className={`truncate font-semibold ${isMe ? "text-gold-deep" : "text-ink"}`}>
                  {fullName(student)}
                  {isMe && <span className="ml-2 text-xs font-normal text-ink/40">(you)</span>}
                </p>
                <TierGem s={student} />
                <TitleFlair s={student} />
              </div>
              <span className="inline-flex flex-shrink-0 items-center gap-1 font-display text-base font-semibold text-emerald-600">
                <Icon name="coins" className="h-4 w-4" /> {metric(student)}
              </span>
            </div>
          );
        })}
        {!list.length && (
          <p className="p-6 text-center text-sm text-ink/40">
            {mode === "season"
              ? <>No points earned in {scopeName} this month yet — be the first to climb! 🏆</>
              : <>No ranked students in {scopeName} yet — earn reward points to appear here! 🏆</>}
          </p>
        )}
      </div>

      {/* ── Hall of Fame — champions of the last completed season ─── */}
      {champions.length > 0 && (
        <div className="card overflow-hidden p-0">
          <div className="flex items-center gap-2 border-b border-line/60 px-5 py-3">
            <Icon name="crown" className="h-4 w-4 text-gold-deep" />
            <h2 className="font-display text-base font-semibold text-ink">Hall of Fame</h2>
            {hofLabel && <span className="ml-auto rounded-full bg-gold-pale px-2.5 py-0.5 text-[11px] font-bold text-gold-deep">{hofLabel}</span>}
          </div>
          <div className="divide-y divide-line/60">
            {champions.map((c) => (
              <div key={c.rank} className="flex items-center gap-3 px-5 py-3">
                <span className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg ${MEDAL_TINT[c.rank - 1] ?? "text-ink/40"}`}>
                  <Icon name="medal" className="h-4 w-4" />
                </span>
                <p className="flex-1 truncate font-semibold text-ink">{c.name}</p>
                <span className="inline-flex flex-shrink-0 items-center gap-1 font-display text-sm font-semibold text-emerald-600">
                  <Icon name="coins" className="h-3.5 w-3.5" /> {c.points}
                </span>
              </div>
            ))}
          </div>
          <p className="px-5 py-2.5 text-[11px] text-ink/40">Top climbers of {hofLabel || "last season"} — a new champion is crowned every month.</p>
        </div>
      )}
    </div>
  );
}
