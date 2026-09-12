import Link from "next/link";
import { notFound } from "next/navigation";
import MarketingShell from "@/components/landing/MarketingShell";
import BlogContent from "@/components/blog/BlogContent";
import NewsletterSignup from "@/components/blog/NewsletterSignup";
import ReactionBar from "@/components/blog/ReactionBar";
import Comments from "@/components/blog/Comments";
import { supabaseServer } from "@/lib/supabase/server";
import { accentOf, previewOf, readingTime, formatDate, type BlogPost, type BlogComment } from "@/lib/blog";

export const dynamic = "force-dynamic";

async function getPost(slug: string): Promise<BlogPost | null> {
  const supa = supabaseServer();
  const { data } = await supa.from("blog_posts").select("*").eq("slug", slug).eq("status", "published").maybeSingle();
  return (data as BlogPost) ?? null;
}

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const p = await getPost(params.slug);
  if (!p) return { title: "Post not found — D-Maths Blog" };
  const desc = previewOf(p, 160);
  return {
    title: `${p.title} — D-Maths Blog`,
    description: desc,
    alternates: { canonical: `/blog/${p.slug}` },
    openGraph: { title: p.title, description: desc, images: p.cover_url ? [p.cover_url] : undefined, type: "article" },
  };
}

function Meta({ p }: { p: BlogPost }) {
  return (
    <p className="text-[13px] text-ink/50">
      By <span className="font-semibold text-ink/70">{p.author || "D-Maths"}</span> · {formatDate(p.published_at)} · {readingTime(p.body)}
    </p>
  );
}

export default async function BlogPostPage({ params }: { params: { slug: string } }) {
  const p = await getPost(params.slug);
  if (!p) notFound();
  const a = accentOf(p.accent);

  // Approved comments only (public RLS enforces this too).
  const { data: commentRows } = await supabaseServer()
    .from("blog_comments").select("*").eq("post_id", p.id).eq("status", "approved")
    .order("created_at", { ascending: false });
  const comments = (commentRows ?? []) as BlogComment[];
  const wide = p.layout === "wide";
  const minimal = p.layout === "minimal";

  return (
    <MarketingShell>
      {/* Wide feature: full-bleed cover hero with the title overlaid */}
      {wide && p.cover_url ? (
        <header className="relative isolate flex min-h-[52vh] items-end overflow-hidden bg-board">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={p.cover_url} alt="" className="absolute inset-0 h-full w-full object-cover opacity-80" />
          <div className="absolute inset-0 bg-gradient-to-t from-board via-board/70 to-board/20" />
          <div className="relative mx-auto w-full max-w-3xl px-5 py-12 text-white">
            {p.category && <span className={`inline-block rounded-full px-3 py-1 text-[12px] font-bold ${a.bg} text-white`}>{p.category}</span>}
            <h1 className="mt-3 font-display text-3xl font-extrabold leading-tight sm:text-4xl md:text-5xl">{p.title}</h1>
            <p className="mt-3 text-[13px] text-white/70">By {p.author || "D-Maths"} · {formatDate(p.published_at)} · {readingTime(p.body)}</p>
          </div>
        </header>
      ) : (
        <header className="border-b border-line bg-chalk/40">
          <div className="mx-auto max-w-3xl px-5 py-12 text-center sm:py-14">
            <Link href="/blog" className={`text-[13px] font-bold ${a.text} hover:underline`}>← Back to the blog</Link>
            {p.category && <p className={`mt-4 inline-block rounded-full px-3 py-1 text-[12px] font-bold ${a.softBg} ${a.text}`}>{p.category}</p>}
            <h1 className="mt-3 font-display text-3xl font-bold leading-tight text-ink sm:text-4xl">{p.title}</h1>
            <div className="mt-3"><Meta p={p} /></div>
          </div>
        </header>
      )}

      <article className="mx-auto max-w-3xl px-5 py-12">
        {/* Standard: cover sits above the article. Minimal: no big cover. */}
        {!wide && !minimal && p.cover_url && (
          <div className="mb-9 overflow-hidden rounded-3xl border border-line bg-chalk shadow-sm">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.cover_url} alt="" className="w-full object-cover" />
          </div>
        )}

        {p.excerpt && !minimal && (
          <p className={`mb-8 border-l-4 pl-4 text-[16px] font-medium italic leading-relaxed text-ink/70 ${a.border}`}>{p.excerpt}</p>
        )}

        <BlogContent body={p.body} />

        {p.tags?.length > 0 && (
          <div className="mt-10 flex flex-wrap gap-2 border-t border-line pt-6">
            {p.tags.map((t) => (
              <span key={t} className="rounded-full border border-line bg-white px-3 py-1 text-[12px] font-semibold text-ink/60">#{t}</span>
            ))}
          </div>
        )}

        {/* Reactions */}
        <div className="mt-8 border-t border-line pt-6">
          <ReactionBar postId={p.id} />
        </div>

        {/* Comments */}
        <div className="mt-10 border-t border-line pt-8">
          <Comments postId={p.id} initial={comments} />
        </div>
      </article>

      {/* Newsletter */}
      <section className="border-t border-line bg-chalk/40">
        <div className="mx-auto max-w-2xl px-5 py-14 text-center">
          <h2 className="font-display text-xl font-bold text-ink md:text-2xl">Enjoyed this? Get the next one by email.</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-ink/55">Subscribe for study tips, exam guidance and D-Maths news.</p>
          <div className="mt-6"><NewsletterSignup /></div>
        </div>
      </section>
    </MarketingShell>
  );
}
