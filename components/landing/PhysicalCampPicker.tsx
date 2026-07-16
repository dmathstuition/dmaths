"use client";
import { useState } from "react";
import Link from "next/link";
import { PHYSICAL_TIERS, SUMMER_CAMP, fmtNgn } from "@/lib/summerCamp";

// The in-person (Asaba) price selector: pick a class, see the naira price, register.
export default function PhysicalCampPicker() {
  const [id, setId] = useState(PHYSICAL_TIERS.find((t) => t.highlight)?.id ?? PHYSICAL_TIERS[0].id);
  const tier = PHYSICAL_TIERS.find((t) => t.id === id) ?? PHYSICAL_TIERS[0];

  return (
    <div className="rounded-3xl bg-white p-6 shadow-xl ring-1 ring-gold/15">
      <p className="text-[11px] font-bold uppercase tracking-wider text-gold-deep">In-person · Asaba</p>
      <label htmlFor="phys" className="mt-3 block text-sm font-bold text-ink/70">Choose your class</label>
      <div className="relative mt-1.5">
        <select
          id="phys"
          value={id}
          onChange={(e) => setId(e.target.value)}
          className="w-full appearance-none rounded-2xl border border-gold/25 bg-chalk/60 py-3.5 pl-4 pr-10 text-sm font-semibold text-ink outline-none transition focus:border-gold focus:bg-white focus:ring-4 focus:ring-gold/15"
        >
          {PHYSICAL_TIERS.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name} — {fmtNgn(t.ngn)}
            </option>
          ))}
        </select>
        <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-gold-deep">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6" /></svg>
        </span>
      </div>

      <div className="mt-5 flex items-end justify-between border-t border-line pt-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wide text-ink/40">Price · whole camp</p>
          <p className="font-display text-4xl font-extrabold text-ink">{fmtNgn(tier.ngn)}</p>
        </div>
        <span className="rounded-full bg-gold-pale px-3 py-1 text-[11px] font-bold text-gold-deep">4× / week</span>
      </div>

      <Link
        href={`/apply?camp=${SUMMER_CAMP.season}&plan=${tier.id}`}
        className="btn-gold mt-5 inline-flex w-full items-center justify-center gap-1.5 !rounded-full !text-base"
      >
        Register for {tier.name} →
      </Link>
      <p className="mt-3 text-center text-[11px] text-ink/40">Pay in full or a 50% deposit now, balance later.</p>
    </div>
  );
}
