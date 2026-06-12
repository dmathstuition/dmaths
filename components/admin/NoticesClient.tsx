"use client";
import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";

const TARGETS = ["all","Algebra","Calculus","Statistics","Geometry","Further Mathematics","Physics","JavaScript","Python","External Examinations"];

export default function NoticesClient({ initial }: { initial: any[] }) {
  const supabase = supabaseBrowser();
  const [notices, setNotices] = useState<any[]>(initial);
  const [f, setF] = useState({ title: "", body: "", target: "all" });

  async function reload() {
    const { data } = await supabase.from("notices").select("*").order("created_at", { ascending: false });
    setNotices(data ?? []);
  }

  async function post() {
    if (!(f.title && f.body)) return alert("Add a title and message.");
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("notices").insert({ ...f, created_by: user?.id });
    setF({ title: "", body: "", target: "all" });
    reload();
  }
  async function emailNotice(id: string) {
    if (!confirm('Email this announcement to all targeted students? This uses your daily Gmail quota.')) return;
    const res = await fetch('/api/notices/email', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ noticeId: id }),
    });
    const json = await res.json();
    if (!res.ok) return alert(json.error || 'Failed to send');
    alert(`Sent to ${json.sent} student(s)${json.failed ? `, ${json.failed} failed` : ''}.`);
    reload();
  }

  async function remove(id: string) {
    if (!confirm("Delete this announcement permanently?")) return;
    await supabase.from("notices").delete().eq("id", id);
    reload();
  }

  return (
    <div className="space-y-5">
      <h1 className="font-display text-3xl font-semibold">Announcements</h1>
      <div className="card space-y-3 p-6">
        <input className="field" placeholder="Title" value={f.title} onChange={e => setF({ ...f, title: e.target.value })} />
        <textarea className="field min-h-24" placeholder="Write your announcement…" value={f.body} onChange={e => setF({ ...f, body: e.target.value })} />
        <div className="flex flex-wrap items-center gap-3">
          <select className="field max-w-xs" value={f.target} onChange={e => setF({ ...f, target: e.target.value })}>
            {TARGETS.map(t => <option key={t} value={t}>{t === "all" ? "All students" : `${t} students`}</option>)}
          </select>
          <button className="btn-gold" onClick={post}>Post announcement</button>
        </div>
      </div>

      {notices.map(n => (
        <article key={n.id} className="card border-l-4 border-l-gold p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-extrabold">{n.title}</h2>
              <p className="text-xs text-ink/40">
                {new Date(n.created_at).toLocaleDateString("en-NG", { dateStyle: "medium" })} · {n.target === "all" ? "All students" : n.target}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {n.emailed_at
                ? <span className="pill-green">Emailed ({n.emailed_count})</span>
                : <button className="text-sm font-bold text-gold-deep hover:underline" onClick={() => emailNotice(n.id)}>Email students</button>}
              <button className="text-sm font-bold text-red-600 hover:underline" onClick={() => remove(n.id)}>Delete</button>
            </div>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-ink/65">{n.body}</p>
        </article>
      ))}
      {!notices.length && <div className="card p-12 text-center text-ink/40">No announcements yet.</div>}
    </div>
  );
}
