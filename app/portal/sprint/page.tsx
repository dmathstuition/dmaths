import MathSprintClient from "@/components/portal/MathSprintClient";
import { Icon } from "@/components/Icons";

export const dynamic = "force-dynamic";

// A pure-fun mental-maths mini-game. The A.I sets staged question pools (with a
// local generator as the instant fallback); the personal best lives in the
// browser, so there's no backend or schema. It's here to make the portal playful.
export default function SprintPage() {
  return (
    <div className="space-y-6">
      <div className="boardgrid relative flex items-center gap-4 overflow-hidden rounded-2xl bg-board p-7 text-white">
        <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-gold/15 text-gold ring-1 ring-gold/25">
          <Icon name="zap" className="h-6 w-6" />
        </span>
        <div>
          <h1 className="font-display text-2xl font-semibold sm:text-3xl">Math Sprint</h1>
          <p className="mt-1 text-sm text-white/50">Climb the stages — solve as many as you can in 60 seconds and beat your best!</p>
        </div>
      </div>

      <MathSprintClient />
    </div>
  );
}
