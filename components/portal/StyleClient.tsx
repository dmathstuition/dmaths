"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/Icons";
import Mascot from "@/components/Mascot";
import Confetti from "@/components/ui/Confetti";
import { learnerAvatarFor } from "@/lib/avatars";
import { CHARACTERS, FRAMES, frameClass, isFree } from "@/lib/cosmetics";

export default function StyleClient({
  meId, name, initialCharacter, initialFrame,
}: {
  meId: string; name: string; initialCharacter: string | null; initialFrame: string;
}) {
  const router = useRouter();
  const [character, setCharacter] = useState<string | null>(initialCharacter);
  const [frame, setFrame] = useState<string>(initialFrame || "none");
  const [owned, setOwned] = useState<Set<string>>(new Set());
  const [spendable, setSpendable] = useState(0);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState("");
  const [celebrate, setCelebrate] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/cosmetics");
        const j = await r.json();
        setSpendable(j.spendable ?? 0);
        setOwned(new Set(j.ownedFrames ?? []));
        if (j.equipped) { setCharacter(j.equipped.character ?? null); setFrame(j.equipped.frame ?? "none"); }
        if (j.error) setErr(j.error);
      } catch { /* keep defaults */ }
    })();
  }, []);

  const previewSrc = learnerAvatarFor(meId, character);
  const has = (key: string) => isFree(key) || owned.has(key);

  async function post(payload: any) {
    const r = await fetch("/api/cosmetics", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
    });
    return { ok: r.ok, json: await r.json().catch(() => ({})) };
  }

  async function pickCharacter(key: string) {
    setErr(""); setCharacter(key); setBusy(`c:${key}`);
    const { ok, json } = await post({ action: "equip", character: key });
    setBusy(null);
    if (!ok) { setErr(json.error || "Couldn't save — try again."); return; }
    router.refresh();
  }

  async function equipFrame(key: string) {
    setErr(""); setFrame(key); setBusy(`f:${key}`);
    const { ok, json } = await post({ action: "equip", frame: key });
    setBusy(null);
    if (!ok) { setErr(json.error || "Couldn't equip — try again."); return; }
    router.refresh();
  }

  async function unlockFrame(key: string) {
    setErr(""); setBusy(`u:${key}`);
    const { ok, json } = await post({ action: "unlock", frame: key });
    setBusy(null);
    if (!ok) { setErr(json.error || "Couldn't unlock — try again."); return; }
    setOwned((s) => new Set(s).add(key));
    setSpendable(json.spendable ?? spendable);
    setFrame(key);
    setCelebrate((c) => c + 1);
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="pointer-events-none fixed inset-0 z-[60]"><Confetti fire={celebrate > 0} key={celebrate} pieces={48} /></div>

      {/* ── Hero preview ────────────────────────────────────────── */}
      <div className="relative flex items-center gap-5 overflow-hidden rounded-3xl p-7 text-white sm:p-8"
        style={{ background: "linear-gradient(135deg, #10406F 0%, #0A2A4F 55%, #071C36 100%)" }}>
        <div aria-hidden className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full" style={{ background: "radial-gradient(circle, rgba(239,174,86,.4), transparent 70%)" }} />
        <div aria-hidden className="pointer-events-none absolute right-6 top-6 text-gold/25 float"><Icon name="sparkles" className="h-5 w-5" /></div>
        {/* live avatar preview */}
        <span className={`relative flex h-24 w-24 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-ink to-board font-display text-2xl font-bold text-gold-soft shadow-lift ${frameClass(frame)}`}>
          <span aria-hidden>{name.slice(0, 1).toUpperCase()}</span>
          <Mascot src={previewSrc} alt="" className="absolute inset-0 h-full w-full object-cover object-top" fallback={null} />
        </span>
        <div className="relative min-w-0">
          <h1 className="font-display text-2xl font-semibold sm:text-3xl">Avatar Studio</h1>
          <p className="mt-1 text-sm text-white/55">Make it yours — pick a character and unlock frames with your points.</p>
          <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-sm font-bold text-gold ring-1 ring-gold/25">
            <Icon name="coins" className="h-4 w-4" /> {spendable} to spend
          </p>
        </div>
      </div>

      {err && <p role="alert" className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">{err}</p>}

      {/* ── Characters ──────────────────────────────────────────── */}
      <div className="card p-6">
        <h2 className="mb-4 font-display text-lg font-semibold text-ink">Character</h2>
        <div className="grid grid-cols-4 gap-3">
          {CHARACTERS.map((c) => {
            const active = character === c.key;
            return (
              <button key={c.key} onClick={() => pickCharacter(c.key)} disabled={busy === `c:${c.key}`}
                className={`group flex flex-col items-center gap-1.5 rounded-2xl border p-3 transition ${active ? "border-gold bg-gold-pale" : "border-line bg-white hover:bg-chalk"}`}>
                <span className="relative flex h-14 w-14 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-ink to-board ring-1 ring-line">
                  <Mascot src={c.src} alt="" className="h-full w-full object-cover object-top" fallback={null} />
                </span>
                <span className={`text-[11px] font-bold ${active ? "text-gold-deep" : "text-ink/55"}`}>{c.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Frames ──────────────────────────────────────────────── */}
      <div className="card p-6">
        <h2 className="mb-4 font-display text-lg font-semibold text-ink">Frames</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {FRAMES.map((f) => {
            const owns = has(f.key);
            const equipped = frame === f.key;
            const affordable = spendable >= f.cost;
            const loading = busy === `f:${f.key}` || busy === `u:${f.key}`;
            return (
              <div key={f.key} className={`flex items-center gap-3 rounded-2xl border p-3 transition ${equipped ? "border-gold bg-gold-pale/60" : "border-line bg-white"}`}>
                <span className={`relative flex h-12 w-12 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-ink to-board ${f.ring}`}>
                  <Mascot src={previewSrc} alt="" className="h-full w-full object-cover object-top" fallback={null} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-ink">{f.name}</p>
                  <p className="text-[11px] text-ink/45">{isFree(f.key) ? "Free" : owns ? "Owned" : <span className="inline-flex items-center gap-1"><Icon name="coins" className="h-3 w-3" /> {f.cost}</span>}</p>
                </div>
                {equipped ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-gold px-3 py-1.5 text-[11px] font-bold text-board"><Icon name="checkCircle" className="h-3.5 w-3.5" /> On</span>
                ) : owns ? (
                  <button onClick={() => equipFrame(f.key)} disabled={loading} className="rounded-full border border-line bg-white px-3 py-1.5 text-[11px] font-bold text-ink/70 transition hover:bg-chalk disabled:opacity-50">{loading ? "…" : "Equip"}</button>
                ) : (
                  <button onClick={() => unlockFrame(f.key)} disabled={loading || !affordable}
                    className="inline-flex items-center gap-1 rounded-full bg-gold px-3 py-1.5 text-[11px] font-bold text-board transition hover:brightness-105 disabled:opacity-40"
                    title={affordable ? "" : `Need ${f.cost} points`}>
                    {loading ? "…" : <><Icon name="lock" className="h-3 w-3" /> {f.cost}</>}
                  </button>
                )}
              </div>
            );
          })}
        </div>
        <p className="mt-3 text-[12px] text-ink/45">
          Frames cost points to unlock but never lower your leaderboard total — that keeps climbing. Your look shows across your whole portal.
        </p>
      </div>
    </div>
  );
}
