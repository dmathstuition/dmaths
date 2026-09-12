"use client";
import { useMemo, useRef, useState } from "react";
import { LAYOUTS, ACCENTS, accentOf, slugify, formatDate, type BlogPost, type BlogSubscriber } from "@/lib/blog";

type Draft = {
  id: string | null;
  title: string; slug: string; excerpt: string; body: string;
  cover_url: string; category: string; tags: string;
  layout: string; accent: string; author: string;
};

const EMPTY: Draft = {
  id: null, title: "", slug: "", excerpt: "", body: "",
  cover_url: "", category: "", tags: "", layout: "standard", accent: "gold", author: "D-Maths",
};

export default function BlogAdminClient({ initialPosts, subscribers }: { initialPosts: BlogPost[]; subscribers: BlogSubscriber[] }) {
  const [posts, setPosts] = useState<BlogPost[]>(initialPosts);
  const [d, setD] = useState<Draft>(EMPTY);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");
  const [tab, setTab] = useState<"posts" | "subscribers">("posts");

  const [coverBusy, setCoverBusy] = useState(false);
  const [bodyImgBusy, setBodyImgBusy] = useState(false);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  const active = subscribers.filter((s) => !s.unsubscribed_at);
  const editing = !!d.id;

  const previewSlug = useMemo(() => slugify(d.slug || d.title), [d.slug, d.title]);

  // Upload a picture to the blog storage bucket and return its public URL.
  async function uploadImage(file: File, folder: string): Promise<string | null> {
    if (file.size > 10 * 1024 * 1024) { setErr("Image too large — 10 MB maximum."); return null; }
    const form = new FormData();
    form.append("file", file);
    form.append("bucket", "blog");
    form.append("folder", folder);
    const res = await fetch("/api/upload", { method: "POST", body: form });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) { setErr(`Upload failed: ${json.error || "please try again"}`); return null; }
    return json.url as string;
  }

  async function onCoverFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; e.target.value = "";
    if (!file) return;
    setCoverBusy(true); setErr(""); setOk("");
    const url = await uploadImage(file, "covers");
    setCoverBusy(false);
    if (url) setD((prev) => ({ ...prev, cover_url: url }));
  }

  async function onBodyImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; e.target.value = "";
    if (!file) return;
    setBodyImgBusy(true); setErr(""); setOk("");
    const url = await uploadImage(file, "posts");
    setBodyImgBusy(false);
    if (!url) return;
    // Insert an image tag at the cursor (or append), on its own line.
    const el = bodyRef.current;
    const snippet = `\n\n![](${url})\n\n`;
    if (el) {
      const start = el.selectionStart ?? el.value.length;
      const end = el.selectionEnd ?? el.value.length;
      const next = el.value.slice(0, start) + snippet + el.value.slice(end);
      setD((prev) => ({ ...prev, body: next }));
      requestAnimationFrame(() => { const pos = start + snippet.length; el.focus(); el.setSelectionRange(pos, pos); });
    } else {
      setD((prev) => ({ ...prev, body: prev.body + snippet }));
    }
  }

  async function call(payload: Record<string, any>) {
    setBusy(true); setErr(""); setOk("");
    try {
      const res = await fetch("/api/admin/blog", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) { setErr(json.error || "Something went wrong."); return false; }
      if (json.posts) setPosts(json.posts as BlogPost[]);
      return true;
    } catch { setErr("Network error — please try again."); return false; }
    finally { setBusy(false); }
  }

  async function save() {
    if (!d.title.trim()) { setErr("Add a title first."); return; }
    const okRes = await call({ action: "save", ...d });
    if (okRes) { setOk(editing ? "Post updated." : "Draft created."); reset(); }
  }
  function reset() { setD(EMPTY); }
  function edit(p: BlogPost) {
    setD({
      id: p.id, title: p.title, slug: p.slug, excerpt: p.excerpt || "", body: p.body || "",
      cover_url: p.cover_url || "", category: p.category || "", tags: (p.tags || []).join(", "),
      layout: p.layout || "standard", accent: p.accent || "gold", author: p.author || "D-Maths",
    });
    setOk(""); setErr("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  async function del(id: string) {
    if (!confirm("Delete this post permanently?")) return;
    if (await call({ action: "delete", id }) && d.id === id) reset();
  }

  function exportCsv() {
    const rows = [["email", "status", "source", "subscribed_at"]];
    for (const s of subscribers) rows.push([s.email, s.unsubscribed_at ? "unsubscribed" : "active", s.source || "", s.created_at]);
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a"); a.href = url; a.download = "blog-subscribers.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl font-semibold">Blog</h1>
        <div className="flex rounded-full border border-line bg-white p-1 text-sm font-bold">
          <button onClick={() => setTab("posts")} className={`rounded-full px-4 py-1.5 transition ${tab === "posts" ? "bg-gold text-white" : "text-ink/60"}`}>Posts ({posts.length})</button>
          <button onClick={() => setTab("subscribers")} className={`rounded-full px-4 py-1.5 transition ${tab === "subscribers" ? "bg-gold text-white" : "text-ink/60"}`}>Subscribers ({active.length})</button>
        </div>
      </div>

      {tab === "posts" && (
        <>
          {/* Editor */}
          <div className="card space-y-3 p-6">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-bold">{editing ? "Edit post" : "New post"}</h2>
              {editing && <button className="text-sm font-bold text-ink/50 hover:underline" onClick={reset}>+ New post instead</button>}
            </div>

            <input className="field" placeholder="Post title" value={d.title} onChange={(e) => setD({ ...d, title: e.target.value })} />
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-ink/40">URL:</span>
              <span className="text-xs text-ink/50">/blog/</span>
              <input className="field !h-8 max-w-xs !py-1 text-xs" placeholder={previewSlug} value={d.slug} onChange={(e) => setD({ ...d, slug: e.target.value })} />
              <span className="text-xs text-ink/40">→ /blog/{previewSlug}</span>
            </div>

            <textarea className="field min-h-16" placeholder="Short excerpt / summary (shown on cards and at the top of the post)"
              value={d.excerpt} onChange={(e) => setD({ ...d, excerpt: e.target.value })} />

            <div className="flex items-center justify-between gap-2">
              <label className="text-[13px] font-semibold text-ink/70" htmlFor="blog-body">Post content</label>
              <label className={`btn-ghost !min-h-0 cursor-pointer !px-3 !py-1.5 !text-[13px] ${bodyImgBusy ? "pointer-events-none opacity-60" : ""}`}>
                {bodyImgBusy ? "Uploading…" : "🖼 Insert image"}
                <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="hidden" onChange={onBodyImage} disabled={bodyImgBusy} />
              </label>
            </div>
            <textarea id="blog-body" ref={bodyRef} className="field min-h-64 font-mono text-[13px]" placeholder={"Write the post here.\n\n## A heading\n\nParagraphs are separated by a blank line. You can use **bold**, *italic*, `code`, [links](https://example.com), images, and lists:\n\n- point one\n- point two"}
              value={d.body} onChange={(e) => setD({ ...d, body: e.target.value })} />
            <p className="text-[12px] text-ink/40">Formatting: <code>## Heading</code>, <code>### Subheading</code>, <code>- bullet</code>, <code>1. numbered</code>, <code>&gt; quote</code>, <code>**bold**</code>, <code>*italic*</code>, <code>`code`</code>, <code>[text](https://link)</code>, <code>![](image)</code>. Use <strong>Insert image</strong> to upload a picture straight into the post.</p>

            {/* Cover image — upload or paste a link */}
            <div className="rounded-2xl border border-line bg-chalk/40 p-4">
              <p className="text-[13px] font-semibold text-ink/70">Cover image <span className="font-normal text-ink/40">(optional)</span></p>
              <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-start">
                {d.cover_url ? (
                  <div className="relative w-full sm:w-56">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={d.cover_url} alt="Cover preview" className="aspect-[16/9] w-full rounded-xl border border-line object-cover" />
                    <button type="button" onClick={() => setD({ ...d, cover_url: "" })}
                      className="absolute right-1.5 top-1.5 rounded-full bg-black/60 px-2 py-0.5 text-[11px] font-bold text-white hover:bg-black/80">Remove</button>
                  </div>
                ) : (
                  <label className={`flex aspect-[16/9] w-full cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-line bg-white text-center transition hover:border-gold/50 sm:w-56 ${coverBusy ? "pointer-events-none opacity-60" : ""}`}>
                    <span className="text-2xl">🖼</span>
                    <span className="text-[13px] font-semibold text-ink/60">{coverBusy ? "Uploading…" : "Upload a picture"}</span>
                    <span className="text-[11px] text-ink/40">PNG, JPG, WEBP or GIF · 10 MB max</span>
                    <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="hidden" onChange={onCoverFile} disabled={coverBusy} />
                  </label>
                )}
                <div className="flex-1">
                  <input className="field" placeholder="…or paste an image URL" value={d.cover_url} onChange={(e) => setD({ ...d, cover_url: e.target.value })} />
                  <p className="mt-1 text-[12px] text-ink/40">Upload straight from your device, or paste a link if the image already lives online.</p>
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <input className="field" placeholder="Category (e.g. Exam tips)" value={d.category} onChange={(e) => setD({ ...d, category: e.target.value })} />
              <input className="field" placeholder="Tags, comma separated" value={d.tags} onChange={(e) => setD({ ...d, tags: e.target.value })} />
              <input className="field sm:col-span-2" placeholder="Author" value={d.author} onChange={(e) => setD({ ...d, author: e.target.value })} />
            </div>

            {/* Presentation — "designed in a different form" */}
            <div className="rounded-2xl border border-line bg-chalk/40 p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-ink/50">Design this post</p>
              <div className="mt-3 grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-[13px] font-semibold text-ink/70">Layout</p>
                  <div className="mt-1.5 space-y-1.5">
                    {LAYOUTS.map((l) => (
                      <label key={l.id} className={`flex cursor-pointer flex-wrap items-center gap-x-2.5 gap-y-1 rounded-lg border p-2.5 text-sm transition ${d.layout === l.id ? "border-gold bg-gold/10" : "border-line bg-white hover:border-gold/40"}`}>
                        <input type="radio" name="layout" checked={d.layout === l.id} onChange={() => setD({ ...d, layout: l.id })} />
                        <span className="font-bold text-ink">{l.label}</span>
                        <span className="w-full pl-[26px] text-[12px] font-normal leading-snug text-ink/50">{l.hint}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-ink/70">Accent colour</p>
                  <div className="mt-1.5 flex flex-wrap gap-2">
                    {ACCENTS.map((a) => {
                      const cls = accentOf(a.id);
                      return (
                        <button key={a.id} type="button" onClick={() => setD({ ...d, accent: a.id })}
                          className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-semibold transition ${d.accent === a.id ? `${cls.border} ${cls.softBg} ${cls.text} ring-2 ${cls.ring}` : "border-line bg-white text-ink/60 hover:border-gold/40"}`}>
                          <span className={`h-3 w-3 rounded-full ${cls.bg}`} />{a.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {err && <p className="text-sm font-semibold text-red-600">{err}</p>}
            {ok && <p className="text-sm font-semibold text-emerald-600">{ok}</p>}

            <div className="flex flex-wrap items-center gap-3">
              <button className="btn-gold" onClick={save} disabled={busy}>{busy ? "Saving…" : editing ? "Save changes" : "Create draft"}</button>
              {editing && <button className="btn-ghost" onClick={reset} disabled={busy}>Cancel</button>}
            </div>
          </div>

          {/* Post list */}
          {posts.length === 0 && <div className="card p-12 text-center text-ink/40">No posts yet — write your first above.</div>}
          {posts.map((p) => {
            const cls = accentOf(p.accent);
            return (
              <article key={p.id} className={`card p-5 ${d.id === p.id ? "ring-2 ring-gold" : ""}`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${p.status === "published" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>{p.status === "published" ? "Published" : "Draft"}</span>
                      {p.featured && <span className="rounded-full bg-gold/15 px-2 py-0.5 text-[11px] font-bold text-gold-deep">★ Featured</span>}
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${cls.softBg} ${cls.text}`}>{p.layout} · {p.accent}</span>
                      {p.category && <span className="text-[11px] font-semibold text-ink/40">{p.category}</span>}
                    </div>
                    <h3 className="mt-1.5 font-extrabold text-ink">{p.title}</h3>
                    <p className="text-xs text-ink/40">/blog/{p.slug} · {p.status === "published" ? formatDate(p.published_at) : "updated " + formatDate(p.updated_at)}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-sm font-bold">
                    {p.status === "published"
                      ? <a href={`/blog/${p.slug}`} target="_blank" rel="noopener noreferrer" className="text-ink/60 hover:underline">View</a>
                      : null}
                    {p.status === "published"
                      ? <button className="text-amber-700 hover:underline" onClick={() => call({ action: "unpublish", id: p.id })} disabled={busy}>Unpublish</button>
                      : <button className="text-emerald-700 hover:underline" onClick={() => call({ action: "publish", id: p.id })} disabled={busy}>Publish</button>}
                    <button className="text-ink/60 hover:underline" onClick={() => call({ action: "feature", id: p.id, featured: !p.featured })} disabled={busy}>{p.featured ? "Unfeature" : "Feature"}</button>
                    <button className="text-gold-deep hover:underline" onClick={() => edit(p)}>Edit</button>
                    <button className="text-red-600 hover:underline" onClick={() => del(p.id)} disabled={busy}>Delete</button>
                  </div>
                </div>
              </article>
            );
          })}
        </>
      )}

      {tab === "subscribers" && (
        <div className="card p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-lg font-bold">Newsletter subscribers</h2>
              <p className="text-sm text-ink/50">{active.length} active{subscribers.length !== active.length ? ` · ${subscribers.length - active.length} unsubscribed` : ""}</p>
            </div>
            <button className="btn-ghost" onClick={exportCsv} disabled={!subscribers.length}>Export CSV</button>
          </div>
          {subscribers.length === 0 ? (
            <p className="mt-6 text-center text-ink/40">No subscribers yet.</p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-line text-left text-xs uppercase tracking-wide text-ink/40">
                  <th className="py-2 pr-4">Email</th><th className="py-2 pr-4">Status</th><th className="py-2">Subscribed</th>
                </tr></thead>
                <tbody>
                  {subscribers.map((s) => (
                    <tr key={s.id} className="border-b border-line/60">
                      <td className="py-2 pr-4 font-semibold text-ink/80">{s.email}</td>
                      <td className="py-2 pr-4">{s.unsubscribed_at ? <span className="text-ink/40">Unsubscribed</span> : <span className="font-semibold text-emerald-600">Active</span>}</td>
                      <td className="py-2 text-ink/50">{formatDate(s.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
