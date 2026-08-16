import DuelClient from "@/components/portal/DuelClient";
import { Icon } from "@/components/Icons";

export const dynamic = "force-dynamic";
export const metadata = { title: "Quiz Duel · D-Maths" };

// Async head-to-head — everything server-owned via /api/duel; this page frames it.
export default function DuelPage() {
  return (
    <div className="space-y-6">
      <div className="boardgrid relative flex items-center gap-4 overflow-hidden rounded-2xl bg-board p-7 text-white">
        <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-gold/15 text-gold ring-1 ring-gold/25">
          <Icon name="zap" className="h-6 w-6" />
        </span>
        <div>
          <h1 className="font-display text-2xl font-semibold sm:text-3xl">Quiz Duel</h1>
          <p className="mt-1 text-sm text-white/50">Challenge a friend to the same five questions — highest score wins the points.</p>
        </div>
      </div>

      <DuelClient />
    </div>
  );
}
