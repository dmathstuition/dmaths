"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/Icons";
import Mascot from "@/components/Mascot";
import Confetti from "@/components/ui/Confetti";
import { learnerAvatarFor } from "@/lib/avatars";
import { CHARACTERS, TITLES, RARITY, CRATE_COST, cratePool, isFreeTitle, type Rarity } from "@/lib/cosmetics";

type Rolled = { key: string; label: string; rarity: Rarity };

export default function StyleClient({
  meId, name, initialCharacter, initialTitle,
}: {
  meId: string; name: string; initialCharacter: string | null; initialTitle: string;
}) {
  const router = useRouter();
  const [character, setCharacter] = useState<string | null>(initialCharacter);
  const [title, setTitle] = useState<string>(initialTitle || "none");
  const [owned, setOwned] = useState<Set<string>>(new Set());
  const [spendable, setSpendable] = useState(0);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState("");
  const [celebrate, setCelebrate] = useState(0);
  const [crateOpen, setCrateOpen] = useState(false);
  const [reveal, setReveal] = useState<Rolled | null>(null);
  const [giftTitle, setGiftTitle] = useState("");
  const [giftCode, setGiftCode] = useState("");
  const [giftBusy, setGiftBusy] = useState(false);
  const [giftMsg, setGiftMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/cosmetics");
        const j = await r.json();
        setSpendable(j.spendable ?? 0);
        setOwned(new Set(j.ownedTitles ?? []));
        if (j.equipped) { setCharacter(j.equipped.character ?? null); setTitle(j.equipped.title ?? "none"); }
        if (j.error) setErr(j.error);
      } catch { /* keep defaults */ }
    })();
  }, []);

  const previewSrc = learnerAvatarFor(meId, character);
  const has = (key: string) => isFreeTitle(key) || owned.has(key);
  const equippedLabel = TITLES.find((t) => t.key === title)?.label ?? "";
  const poolLeft = cratePool(owned).length;
  const collectedAll = poolLeft === 0;

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

  async function equipTitle(key: string) {
    setErr(""); setTitle(key); setBusy(`t:${key}`);
    const { ok, json } = await post({ action: "equip", title: key });
    setBusy(null);
    if (!ok) { setErr(json.error || "Couldn't equip — try again."); return; }
    router.refresh();
  }

  async function unlockTitle(key: string) {
    setErr(""); setBusy(`u:${key}`);
    const { ok, json } = await post({ action: "unlock", title: key });
    setBusy(null);
    if (!ok) { setErr(json.error || "Couldn't unlock — try again."); return; }
    setOwned((s) => new Set(s).add(key));
    setSpendable(json.spendable ?? spendable);
    setTitle(key);
    setCelebrate((c) => c + 1);
    router.refresh();
  }

  // Gift a title to a friend by their Student ID (paid from your own balance).
  async function sendGift() {
    if (!giftTitle || !giftCode.trim()) { setGiftMsg({ ok: false, text: "Pick a title and enter your friend's Student ID." }); return; }
    setGiftBusy(true); setGiftMsg(null);
    const { ok, json } = await post({ action: "gift", title: giftTitle, toCode: giftCode.trim() });
    setGiftBusy(false);
    if (!ok) { setGiftMsg({ ok: false, text: json.error || "Couldn't send the gift — try again." }); return; }
    setSpendable(json.spendable ?? spendable);
    setGiftMsg({ ok: true, text: `Sent “${json.gifted.label}” to ${json.gifted.to}! 🎁` });
    setGiftCode("");
    setCelebrate((c) => c + 1);
  }

  // Open a Mystery Crate: show the suspense overlay, then reveal the roll.
  async function openCrate() {
    if (crateOpen) return;
    setErr(""); setCrateOpen(true); setReveal(null);
    const started = Date.now();
    const { ok, json } = await post({ action: "crate" });
    const wait = Math.max(0, 1300 - (Date.now() - started)); // let the suspense breathe
    setTimeout(() => {
      if (!ok) { setCrateOpen(false); setErr(json.error || "Couldn't open the crate — try again."); return; }
      setOwned(new Set(json.ownedTitles ?? []));
      setSpendable(json.spendable ?? spendable);
      setTitle(json.rolled.key);
      setReveal(json.rolled);
      setCelebrate((c) => c + 1);
      router.refresh();
    }, wait);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="pointer-events-none fixed inset-0 z-[60]"><Confetti fire={celebrate > 0} key={celebrate} pieces={56} /></div>

      {/* ── Hero preview ────────────────────────────────────────── */}
      <div className="relative flex items-center gap-5 overflow-hidden rounded-3xl p-7 text-white sm:p-8"
        style={{ background: "linear-gradient(135deg, #10406F 0%, #0A2A4F 55%, #071C36 100%)" }}>
        <div aria-hidden className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full" style={{ background: "radial-gradient(circle, rgba(239,174,86,.4), transparent 70%)" }} />
        <div aria-hidden className="pointer-events-none absolute right-6 top-6 text-gold/25 float"><Icon name="sparkles" className="h-5 w-5" /></div>
        {/* live avatar preview */}
        <span className="relative flex h-24 w-24 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-ink to-board font-display text-2xl font-bold text-gold-soft shadow-lift ring-2 ring-gold/40">
          <span aria-hidden>{name.slice(0, 1).toUpperCase()}</span>
          <Mascot src={previewSrc} alt="" className="absolute inset-0 h-full w-full object-cover object-top" fallback={null} />
        </span>
        <div className="relative min-w-0">
          <h1 className="font-display text-2xl font-semibold sm:text-3xl">Avatar Studio</h1>
          <p className="mt-0.5 flex flex-wrap items-center gap-2 text-white/90">
            <span className="font-bold">{name}</span>
            {equippedLabel && <span className="inline-flex items-center gap-1 rounded-full bg-gold px-2.5 py-0.5 text-[11px] font-extrabold text-board"><Icon name="star" className="h-3 w-3" /> {equippedLabel}</span>}
          </p>
          <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-sm font-bold text-gold ring-1 ring-gold/25">
            <Icon name="coins" className="h-4 w-4" /> {spendable} to spend
          </p>
        </div>
      </div>

      {err && <p role="alert" className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">{err}</p>}

      {/* ── Mystery Crate ───────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-3xl border border-gold/30 p-6 text-white"
        style={{ background: "linear-gradient(135deg, #2A1E4F 0%, #1A1436 60%, #10406F 100%)" }}>
        <div aria-hidden className="loot-aura pointer-events-none absolute inset-0" style={{ ["--loot-glow" as any]: "rgba(239,174,86,.5)" }} />
        <div className="relative flex flex-wrap items-center gap-5">
          <span className="loot-pulse flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-2xl bg-gold/15 text-gold ring-1 ring-gold/30" style={{ ["--loot-glow" as any]: "rgba(239,174,86,.7)" }}>
            <Icon name="gift" className="h-10 w-10" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h2 className="font-display text-xl font-bold">Mystery Crate</h2>
              <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-gold ring-1 ring-gold/25">Loot</span>
            </div>
            <p className="mt-1 max-w-md text-[13px] leading-relaxed text-white/60">
              Open it for a random title you don&apos;t own yet. The rarer the pull, the bigger the flex — legendaries are one in a hundred. {poolLeft > 0 ? `${poolLeft} still to collect.` : ""}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {(["common", "rare", "epic", "legendary"] as Rarity[]).map((r) => (
                <span key={r} className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ backgroundColor: `${RARITY[r].color}22`, color: RARITY[r].color }}>
                  <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: RARITY[r].color }} /> {RARITY[r].label}
                </span>
              ))}
            </div>
          </div>
          <button onClick={openCrate} disabled={crateOpen || collectedAll || spendable < CRATE_COST}
            className="btn-gold !min-h-[46px] flex-shrink-0 !rounded-2xl disabled:opacity-40"
            title={collectedAll ? "You own every title" : spendable < CRATE_COST ? `Need ${CRATE_COST} points` : ""}>
            {collectedAll
              ? <span className="inline-flex items-center gap-1.5"><Icon name="trophy" className="h-4 w-4" /> All collected</span>
              : <span className="inline-flex items-center gap-1.5"><Icon name="gift" className="h-4 w-4" /> Open · {CRATE_COST}</span>}
          </button>
        </div>
      </div>

      {/* ── Characters ──────────────────────────────────────────── */}
      <div className="card p-6">
        <h2 className="mb-4 font-display text-lg font-semibold text-ink">Character</h2>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
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

      {/* ── Titles ──────────────────────────────────────────────── */}
      <div className="card p-6">
        <h2 className="mb-1 font-display text-lg font-semibold text-ink">Title</h2>
        <p className="mb-4 text-[13px] text-ink/50">A flair shown next to your name across the portal. Buy one directly, or gamble on a crate above.</p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {TITLES.filter((t) => t.key !== "none" || title === "none").map((t) => {
            const owns = has(t.key);
            const equipped = title === t.key;
            const affordable = spendable >= t.cost;
            const loading = busy === `t:${t.key}` || busy === `u:${t.key}`;
            const rc = RARITY[t.rarity];
            return (
              <div key={t.key} className={`flex items-center gap-3 rounded-2xl border p-3 transition ${equipped ? "border-gold bg-gold-pale/60" : "border-line bg-white"}`}>
                {t.cost > 0 && <span aria-hidden className="h-8 w-1 flex-shrink-0 rounded-full" style={{ backgroundColor: rc.color }} />}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-ink">{t.label || "No title"}</p>
                  <p className="flex items-center gap-1.5 text-[11px] text-ink/45">
                    {t.cost > 0 && <span className="font-bold" style={{ color: rc.color }}>{rc.label}</span>}
                    <span>{isFreeTitle(t.key) ? "Free" : owns ? "· Owned" : <span className="inline-flex items-center gap-1">· <Icon name="coins" className="h-3 w-3" /> {t.cost}</span>}</span>
                  </p>
                </div>
                {equipped ? (
                  <span className="inline-flex flex-shrink-0 items-center gap-1 rounded-full bg-gold px-3 py-1.5 text-[11px] font-bold text-board"><Icon name="checkCircle" className="h-3.5 w-3.5" /> On</span>
                ) : owns ? (
                  <button onClick={() => equipTitle(t.key)} disabled={loading} className="flex-shrink-0 rounded-full border border-line bg-white px-3 py-1.5 text-[11px] font-bold text-ink/70 transition hover:bg-chalk disabled:opacity-50">{loading ? "…" : "Wear it"}</button>
                ) : (
                  <button onClick={() => unlockTitle(t.key)} disabled={loading || !affordable}
                    className="inline-flex flex-shrink-0 items-center gap-1 rounded-full bg-gold px-3 py-1.5 text-[11px] font-bold text-board transition hover:brightness-105 disabled:opacity-40"
                    title={affordable ? "" : `Need ${t.cost} points`}>
                    {loading ? "…" : <><Icon name="lock" className="h-3 w-3" /> {t.cost}</>}
                  </button>
                )}
              </div>
            );
          })}
        </div>
        <p className="mt-3 text-[12px] text-ink/45">
          Spending points never lowers your leaderboard total — that keeps climbing.
        </p>
      </div>

      {/* ── Gift a title ────────────────────────────────────────── */}
      <div className="card p-6">
        <h2 className="mb-1 flex items-center gap-2 font-display text-lg font-semibold text-ink">
          <Icon name="gift" className="h-5 w-5 text-gold-deep" /> Gift a friend
        </h2>
        <p className="mb-4 text-[13px] text-ink/50">Send a title to a friend — you pay from your points, they get to keep it. Enter their Student ID.</p>
        <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
          <label className="block">
            <span className="flabel">Title</span>
            <select className="field" value={giftTitle} onChange={(e) => setGiftTitle(e.target.value)}>
              <option value="">Choose a title…</option>
              {TITLES.filter((t) => t.cost > 0).map((t) => (
                <option key={t.key} value={t.key}>{t.label} · {t.cost} pts</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="flabel">Friend&apos;s Student ID</span>
            <input className="field font-mono uppercase" placeholder="DM-2026-0001" value={giftCode}
              onChange={(e) => setGiftCode(e.target.value)} />
          </label>
          <div className="flex items-end">
            <button onClick={sendGift} disabled={giftBusy} className="btn-gold !rounded-xl w-full disabled:opacity-50 sm:w-auto">
              {giftBusy ? "Sending…" : <span className="inline-flex items-center gap-1.5">Send gift <Icon name="gift" className="h-4 w-4" /></span>}
            </button>
          </div>
        </div>
        {giftMsg && (
          <p className={`mt-3 rounded-xl px-4 py-2.5 text-sm font-semibold ${giftMsg.ok ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-800"}`}>{giftMsg.text}</p>
        )}
      </div>

      {/* ── Crate reveal overlay ────────────────────────────────── */}
      {crateOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-board/80 p-6 backdrop-blur-sm">
          {!reveal ? (
            <div className="flex flex-col items-center gap-5 text-white">
              <span className="loot-pulse flex h-28 w-28 items-center justify-center rounded-3xl bg-gold/15 text-gold ring-1 ring-gold/30" style={{ ["--loot-glow" as any]: "rgba(239,174,86,.85)" }}>
                <Icon name="gift" className="h-14 w-14 animate-bounce" />
              </span>
              <p className="font-display text-lg font-bold">Opening…</p>
            </div>
          ) : (
            <div className="chat-in loot-shine relative w-full max-w-xs overflow-hidden rounded-3xl border p-8 text-center text-white"
              style={{ borderColor: RARITY[reveal.rarity].color, background: "linear-gradient(160deg, #142138 0%, #0A2A4F 100%)", boxShadow: `0 0 60px -12px ${RARITY[reveal.rarity].glow}` }}>
              <div aria-hidden className="loot-aura pointer-events-none absolute inset-0" style={{ ["--loot-glow" as any]: RARITY[reveal.rarity].glow }} />
              <div className="relative">
                <span className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider"
                  style={{ backgroundColor: `${RARITY[reveal.rarity].color}26`, color: RARITY[reveal.rarity].color }}>
                  <Icon name="sparkles" className="h-3.5 w-3.5" /> {RARITY[reveal.rarity].label}
                </span>
                <p className="mt-4 text-[13px] font-semibold text-white/60">You pulled</p>
                <p className="mt-1 font-display text-3xl font-extrabold" style={{ color: RARITY[reveal.rarity].color }}>{reveal.label}</p>
                <p className="mt-3 inline-flex items-center gap-1 text-[12px] text-white/50"><Icon name="checkCircle" className="h-3.5 w-3.5 text-gold" /> Equipped &amp; added to your collection</p>
                <button onClick={() => { setCrateOpen(false); setReveal(null); }} className="btn-gold mt-6 w-full !rounded-2xl">Awesome!</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
