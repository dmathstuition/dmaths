import BossBattleClient from "@/components/portal/BossBattleClient";
import { Icon } from "@/components/Icons";

export const dynamic = "force-dynamic";
export const metadata = { title: "Boss Battle · D-Maths" };

// The weekly Boss Battle: one attempt at a curated question set, a reward for
// defeating it. Everything server-owned via /api/boss — this page just frames it.
export default function BossPage() {
  return (
    <div className="space-y-6">
      <div className="boardgrid relative flex items-center gap-4 overflow-hidden rounded-2xl bg-board p-7 text-white">
        <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-gold/15 text-gold ring-1 ring-gold/25">
          <Icon name="trophy" className="h-6 w-6" />
        </span>
        <div>
          <h1 className="font-display text-2xl font-semibold sm:text-3xl">Boss Battle</h1>
          <p className="mt-1 text-sm text-white/50">A new Boss every week. One attempt — beat the pass mark to claim the reward.</p>
        </div>
      </div>

      <BossBattleClient />
    </div>
  );
}
