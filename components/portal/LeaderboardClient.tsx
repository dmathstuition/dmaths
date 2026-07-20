"use client";
import { useMemo, useState } from "react";
import { Icon } from "@/components/Icons";

type Winner = {
  id: string; first_name: string | null; last_name: string | null;
  reward_points: number; level: string | null; subjects: string[] | null;
};
type Scope = "overall" | "class" | "program";

function fullName(s: Winner) {
  return `${s.first_name ?? ""} ${s.last_name ?? ""}`.trim() || "Student";
}
function initials(s: Winner) {
  return `${s.first_name?.[0] ?? ""}${s.last_name?.[0] ?? ""}`.toUpperCase() || "S";
}

const MEDAL = ["🥇", "🥈", "🥉"];
const PLACE_COLOR = ["#EFAE56", "#9CA3AF", "#B87333"];

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

  const list = useMemo(() => {
    if (scope === "class") return winners.filter(w => w.level === level);
    if (scope === "program") return winners.filter(w => (w.subjects ?? []).includes(subject));
    return winners;
  }, [scope, level, subject, winners]);

  const myRank = list.findIndex(s => s.id === meId) + 1;
  const myPts = list.find(s => s.id === meId)?.reward_points ?? 0;

  const podium = list.slice(0, 3);
  const rest = list.slice(3);
  const podiumOrder = [podium[1], podium[0], podium[2]];

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
      <div className="boardgrid relative overflow-hidden rounded-2xl bg-board p-7 text-white">
        <div aria-hidden className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full"
          style={{ background: "radial-gradient(circle, rgba(239,174,86,.4), transparent 70%)" }} />
        <h1 className="relative font-display text-2xl font-semibold sm:text-3xl">🏆 Leaderboard</h1>
        <p className="relative mt-1 text-sm text-white/50">Top students by reward points across {scopeName}.</p>
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
        <div className="card flex items-center gap-4 p-4">
          <span className="font-display text-3xl font-bold text-gold-deep">#{myRank}</span>
          <div>
            <p className="font-semibold text-ink">Your position <span className="text-ink/40">· {scopeName}</span></p>
            <p className="text-xs text-ink/40">{myPts} reward pts</p>
          </div>
        </div>
      )}

      {/* podium */}
      {podium.length >= 3 && (
        <div className="grid grid-cols-3 gap-3">
          {podiumOrder.map((s, col) => {
            if (!s) return <div key={col} />;
            const place = list.indexOf(s);
            const isMe = s.id === meId;
            const raised = place === 0;
            return (
              <div key={s.id}
                className={`card relative flex flex-col items-center px-2 pb-4 pt-5 text-center ${raised ? "sm:-mt-4" : "mt-2"} ${isMe ? "ring-2 ring-gold/50" : ""}`}>
                <span className="absolute -top-3 text-2xl">{MEDAL[place]}</span>
                <span className="flex h-14 w-14 items-center justify-center rounded-full font-display text-lg font-bold text-white shadow-lift"
                  style={{ background: `linear-gradient(135deg, ${PLACE_COLOR[place]}, #0A2A4F)` }}>
                  {initials(s)}
                </span>
                <p className="mt-2 line-clamp-2 text-sm font-bold text-ink">{fullName(s)}</p>
                {isMe && <span className="text-[11px] font-semibold text-gold-deep">(you)</span>}
                <span className="mt-1 font-display text-lg font-extrabold text-emerald-600">+{s.reward_points}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* ranked list */}
      <div className="card divide-y divide-line/60">
        {(podium.length >= 3 ? rest : list).map((student, idx) => {
          const rank = (podium.length >= 3 ? 3 : 0) + idx + 1;
          const isMe = student.id === meId;
          const medal = rank <= 3 ? MEDAL[rank - 1] : null;
          return (
            <div key={student.id}
              className={`flex items-center gap-3 px-4 py-3 sm:px-5 ${isMe ? "bg-gold/5" : ""}`}>
              <span className="w-7 flex-shrink-0 text-center font-display text-base font-bold text-ink/30">
                {medal ?? `#${rank}`}
              </span>
              <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-ink/90 font-display text-xs font-bold text-gold-soft">
                {initials(student)}
              </span>
              <p className={`flex-1 truncate font-semibold ${isMe ? "text-gold-deep" : "text-ink"}`}>
                {fullName(student)}
                {isMe && <span className="ml-2 text-xs font-normal text-ink/40">(you)</span>}
              </p>
              <span className="flex-shrink-0 font-display text-base font-semibold text-emerald-600">
                +{student.reward_points}
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
