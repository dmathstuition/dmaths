import Link from "next/link";
import Reveal from "@/components/landing/Reveal";
import { Icon } from "@/components/Icons";
import { supabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function ReportCardsPage() {
  const supa = supabaseServer();
  const { data: cards } = await supa
    .from("report_cards")
    .select("id, term, issued_at, avg_score, serial")
    .order("issued_at", { ascending: false });

  const count = cards?.length ?? 0;

  return (
    <div className="space-y-6">
      <div className="boardgrid relative flex items-center gap-4 overflow-hidden rounded-3xl bg-gradient-to-br from-[#10406F] via-[#0A2A4F] to-[#071C36] p-7 text-white">
        <div aria-hidden className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full"
          style={{ background: "radial-gradient(circle, rgba(239,174,86,.4), transparent 70%)" }} />
        <div aria-hidden className="pointer-events-none absolute right-6 top-6 select-none text-xl float">📊</div>
        <div aria-hidden className="pointer-events-none absolute right-24 bottom-6 select-none text-base float" style={{ animationDelay: "1.1s" }}>✨</div>
        <span className="relative flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-gold/15 text-gold ring-1 ring-gold/25">
          <Icon name="reports" className="h-6 w-6" />
        </span>
        <div className="relative">
          <h1 className="font-display text-2xl font-semibold sm:text-3xl">My report cards</h1>
          <p className="mt-1 text-sm text-white/50">
            {count > 0 ? <><span className="font-bold text-gold">{count}</span> report{count !== 1 ? "s" : ""} · tap one to download or print it.</> : "Your termly progress reports will appear here."}
          </p>
        </div>
      </div>

      {cards?.length ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {cards.map((c, i) => {
            const score = c.avg_score ?? null;
            const scoreCls = score === null ? "" : score >= 70 ? "from-emerald-500 to-emerald-600" : score >= 50 ? "from-gold to-gold-deep" : "from-red-400 to-red-500";
            return (
            <Reveal key={c.id} delay={i * 60}>
              <Link href={`/report-card/${c.id}`}
                className="sheen group relative flex h-full items-center gap-4 overflow-hidden rounded-2xl bg-white p-5 shadow-lift ring-1 ring-gold/25 transition-all duration-300 hover:-translate-y-1 hover:ring-gold/50 dark:bg-[#0f2942]">
                <span aria-hidden className="absolute inset-y-0 left-0 w-1.5 bg-gradient-to-b from-[#F4C078] via-[#EFAE56] to-[#C8881F]" />
                {score !== null ? (
                  <span className={`relative flex h-14 w-14 flex-shrink-0 flex-col items-center justify-center rounded-full bg-gradient-to-br ${scoreCls} font-display text-white shadow-lift transition-transform duration-300 group-hover:scale-110`}>
                    <span className="text-lg font-extrabold leading-none">{score}%</span>
                  </span>
                ) : (
                  <span className="relative flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#F4C078] to-[#C8881F] text-board shadow-lift transition-transform duration-300 group-hover:scale-110">
                    <Icon name="reports" className="h-6 w-6" />
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-display text-base font-bold text-ink dark:text-white">{c.term}</p>
                  <p className="mt-0.5 text-[11px] text-ink/40 dark:text-white/40">
                    {new Date(c.issued_at).toLocaleDateString("en-NG", { dateStyle: "medium" })} · {c.serial}
                  </p>
                </div>
                <span className="relative flex-shrink-0 text-gold-deep transition-transform group-hover:translate-y-0.5"><Icon name="download" /></span>
              </Link>
            </Reveal>
            );
          })}
        </div>
      ) : (
        <div className="card flex flex-col items-center gap-2 py-14 text-ink/40">
          <Icon name="reports" className="h-8 w-8" />
          <p className="text-sm">No report cards yet — they&apos;ll appear here at the end of each term.</p>
        </div>
      )}
    </div>
  );
}
