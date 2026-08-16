import SelfCheckClient from "@/components/portal/SelfCheckClient";
import { Icon } from "@/components/Icons";

export const dynamic = "force-dynamic";
export const metadata = { title: "Check my work · D-Maths" };

// Learner self-marking helper. The A.I marks the typed working (it can't read a
// photo) — the snap is just to read alongside while typing it up.
export default function CheckPage() {
  return (
    <div className="space-y-6">
      <div className="boardgrid relative flex items-center gap-4 overflow-hidden rounded-2xl bg-board p-7 text-white">
        <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-gold/15 text-gold ring-1 ring-gold/25">
          <Icon name="checkCircle" className="h-6 w-6" />
        </span>
        <div>
          <h1 className="font-display text-2xl font-semibold sm:text-3xl">Check my work</h1>
          <p className="mt-1 text-sm text-white/50">Stuck on whether you got it right? Type your working and get an instant A.I mark and feedback.</p>
        </div>
      </div>

      <SelfCheckClient />
    </div>
  );
}
