import Link from "next/link";
import Image from "next/image";
import MarketingShell, { PageHeader } from "@/components/landing/MarketingShell";
import Reveal from "@/components/landing/Reveal";
import NewsletterSignup from "@/components/blog/NewsletterSignup";
import { supabaseServer } from "@/lib/supabase/server";
import { accentOf, previewOf, readingTime, formatDate, type BlogPost } from "@/lib/blog";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Blog — Novelia Academy",
  description: "Study tips, exam guidance and news from Novelia — online tuition in maths, English, science and coding.",
  alternates: { canonical: "/blog" },
};

function Card({ p, featured = false }: { p: BlogPost; featured?: boolean }) {
  const a = accentOf(p.accent);
  return (
    <Link href={`/blog/${p.slug}`}
      className={`group glass-card flex h-full flex-col overflow-hidden !rounded-3xl transition hover:-translate-y-0.5 hover:shadow-md ${featured ? "md:flex-row" : ""}`}>
      {p.cover_url ? (
        <div className={`relative overflow-hidden bg-chalk ${featured ? "md:w-1/2" : ""}`}>
          <div className={featured ? "aspect-[16/10] md:h-full" : "aspect-[16/9]"}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.cover_url} alt="" className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]" loading="lazy" />
          </div>
        </div>
      ) : (
        <div className={`relative ${a.softBg} ${featured ? "md:w-1/2" : ""}`}>
          <div className={`flex items-center justify-center ${featured ? "aspect-[16/10] md:h-full" : "aspect-[16/9]"}`}>
            <span className={`font-display text-4xl font-extrabold ${a.text} opacity-40`}>D·M</span>
          </div>
        </div>
      )}
      <div className={`flex flex-1 flex-col p-6 ${featured ? "md:w-1/2 md:justify-center md:p-8" : ""}`}>
        <div className="flex flex-wrap items-center gap-2 text-[12px]">
          {p.category && <span className={`rounded-full px-2.5 py-0.5 font-bold ${a.softBg} ${a.text}`}>{p.category}</span>}
          <span className="text-ink/40">{formatDate(p.published_at)} · {readingTime(p.body)}</span>
        </div>
        <h2 className={`mt-3 font-display font-bold text-ink ${featured ? "text-2xl md:text-3xl" : "text-lg"}`}>{p.title}</h2>
        <p className="mt-2 flex-1 text-[14px] leading-relaxed text-ink/60">{previewOf(p, featured ? 220 : 140)}</p>
        <span className={`mt-4 inline-flex items-center gap-1.5 text-sm font-bold ${a.text}`}>
          Read article
          <svg viewBox="0 0 24 24" className="h-4 w-4 transition group-hover:translate-x-0.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
        </span>
      </div>
    </Link>
  );
}

export default async function BlogIndex() {
  const supa = supabaseServer();
  const { data } = await supa.from("blog_posts").select("*")
    .eq("status", "published")
    .order("featured", { ascending: false })
    .order("published_at", { ascending: false });
  const posts = (data ?? []) as BlogPost[];

  const featured = posts.find((p) => p.featured) ?? posts[0];
  const rest = posts.filter((p) => p.id !== featured?.id);

  return (
    <MarketingShell>
      <PageHeader eyebrow="The Novelia Blog" title="Learning, exams & ideas"
        lead="Study tips, exam guidance and news from our tutors — written to help every learner go further." />

      <section className="mx-auto max-w-6xl px-5 py-14">
        {posts.length === 0 ? (
          <div className="glass-card mx-auto max-w-lg p-12 text-center">
            <p className="font-display text-lg font-bold text-ink">No posts yet</p>
            <p className="mt-2 text-sm text-ink/55">We're working on our first articles — subscribe below and we'll let you know the moment they're live.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {featured && (
              <Reveal><Card p={featured} featured /></Reveal>
            )}
            {rest.length > 0 && (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {rest.map((p, i) => (
                  <Reveal key={p.id} delay={i * 70}><Card p={p} /></Reveal>
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      {/* Newsletter */}
      <section className="border-t border-line bg-chalk/40">
        <div className="mx-auto max-w-3xl px-5 py-16 text-center">
          <p className="text-[12px] font-bold uppercase tracking-[0.18em] text-gold-deep">Stay in the loop</p>
          <h2 className="mt-2 font-display text-2xl font-bold text-ink md:text-3xl">Get new posts by email</h2>
          <p className="mx-auto mt-2 max-w-lg text-sm text-ink/55">Join our newsletter for fresh study tips, exam guidance and Novelia news — no spam, unsubscribe any time.</p>
          <div className="mt-7"><NewsletterSignup /></div>
        </div>
      </section>
    </MarketingShell>
  );
}
