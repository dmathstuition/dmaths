import MathleClient from "@/components/portal/MathleClient";
import { Icon } from "@/components/Icons";

export const dynamic = "force-dynamic";
export const metadata = { title: "Mathle · D-Maths" };

// A daily equation puzzle — everyone gets the same one each day. No backend: the
// day's equation is derived from the date and progress lives in the browser.
export default function MathlePage() {
  return (
    <div className="space-y-6">
      <div className="boardgrid relative flex items-center gap-4 overflow-hidden rounded-2xl bg-board p-7 text-white">
        <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-gold/15 text-gold ring-1 ring-gold/25">
          <Icon name="sigma" className="h-6 w-6" />
        </span>
        <div>
          <h1 className="font-display text-2xl font-semibold sm:text-3xl">Mathle</h1>
          <p className="mt-1 text-sm text-white/50">Crack today's hidden equation in six tries. A fresh one every day.</p>
        </div>
      </div>

      <MathleClient />
    </div>
  );
}
