"use client";
import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";

export default function AssignmentsClient({ initial }: { initial: any[] }) {
  const supabase = supabaseBrowser();
  const [items, setItems] = useState<any[]>(initial);
  const [links, setLinks] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState<string | null>(null);

  async function reload() {
    const { data: { user } } = await supabase.auth.getUser();
    const { data } = await supabase
      .from("assignment_submissions")
      .select("*, assignment:assignments(*)")
      .eq("student_id", user!.id)
      .order("id", { ascending: false });
    setItems(data ?? []);
  }

  async function uploadAndSubmit(submissionId: string, file: File) {
    if (file.size > 10 * 1024 * 1024) { alert("Photo too large — 10 MB maximum."); return; }
    setUploading(submissionId);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("bucket", "submissions");
      fd.append("folder", submissionId);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) { alert(json.error || "Upload failed"); setUploading(null); return; }
      await supabase.from("assignment_submissions")
        .update({ status: "submitted", submitted_at: new Date().toISOString(), file_url: json.url })
        .eq("id", submissionId);
      setUploading(null);
      reload();
    } catch {
      alert("Upload failed — check your connection.");
      setUploading(null);
    }
  }

  async function markSubmitted(id: string) {
    const link = (links[id] || "").trim();
    if (link && !/^https?:\/\//i.test(link)) {
      alert("Please enter a full link starting with http:// or https://");
      return;
    }
    if (!confirm("Mark this assignment as submitted? Your tutor will see it for grading.")) return;
    await supabase.from("assignment_submissions")
      .update({ status: "submitted", submitted_at: new Date().toISOString(), submission_link: link })
      .eq("id", id);
    reload();
  }

  return (
    <div className="space-y-5">
      <h1 className="font-display text-3xl font-semibold">Assignments</h1>
      {items.map(s => {
        const a = s.assignment;
        const now = new Date();
        const cbtOpen = a.type === "cbt" &&
          (!a.cbt_open || now >= new Date(a.cbt_open)) &&
          (!a.cbt_close || now <= new Date(a.cbt_close));
        const hasInlineCBT = a.cbt_questions?.length > 0;
        const hasExternalCBT = a.cbt_link;

        return (
          <article key={s.id} className="card p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-extrabold">
                  {a.title}
                  {a.type === "cbt" && <span className="pill-blue ml-1">CBT</span>}
                  {hasInlineCBT && <span className="pill ml-1 bg-purple-100 text-purple-800">{a.cbt_questions.length} Qs</span>}
                </h2>
                <p className="text-sm text-ink/45">
                  {a.subject} · Due {a.due_date ? new Date(a.due_date).toLocaleDateString("en-NG", { dateStyle: "medium" }) : "TBD"}
                </p>
              </div>
              <span className={s.status === "graded" ? "pill-green" : s.status === "submitted" ? "pill-blue" : "pill-amber"}>{s.status}</span>
            </div>
            {a.instructions && <p className="mt-3 text-sm leading-relaxed text-ink/60">{a.instructions}</p>}

            {/* Attached PDF */}
            {a.file_url && (
              <a href={a.file_url} target="_blank" rel="noopener noreferrer"
                className="mt-3 flex items-center gap-2 rounded-xl border border-line px-4 py-2.5 text-sm font-semibold text-gold-deep hover:bg-chalk">
                {a.file_name || "Assignment PDF"} — tap to view
              </a>
            )}

            {/* Submitted link (if any) */}
            {s.submission_link && (
              <a href={s.submission_link} target="_blank" rel="noopener noreferrer"
                className="mt-3 block truncate rounded-xl border border-line px-4 py-2.5 text-sm font-semibold text-gold-deep hover:bg-chalk">
                Your submitted link: {s.submission_link}
              </a>
            )}
            {s.file_url && (
              <a href={s.file_url} target="_blank" rel="noopener noreferrer"
                className="mt-3 block truncate rounded-xl border border-line px-4 py-2.5 text-sm font-semibold text-gold-deep hover:bg-chalk">
                Your submitted photo / file →
              </a>
            )}

            {/* Graded result */}
            {s.status === "graded" && (
              <div className="mt-4 rounded-xl border-l-4 border-l-emerald-500 bg-emerald-50 px-4 py-3">
                <p className="text-sm font-extrabold text-emerald-900">Grade: {s.grade}/100</p>
                {s.feedback && <p className="mt-1 text-sm text-emerald-900/80">{s.feedback}</p>}
              </div>
            )}

            {/* CBT actions */}
            {a.type === "cbt" && s.status === "pending" && (
              <>
                {cbtOpen ? (
                  hasInlineCBT ? (
                    <a href={`/portal/cbt/${s.id}`} className="btn-ink mt-4 block w-full text-center">Start CBT test ({a.cbt_questions.length} questions)</a>
                  ) : hasExternalCBT ? (
                    <a href={a.cbt_link} target="_blank" rel="noopener noreferrer" className="btn-ink mt-4 block w-full text-center">Open CBT test</a>
                  ) : null
                ) : (
                  <p className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-center text-sm font-bold text-amber-900">
                    {a.cbt_open && now < new Date(a.cbt_open)
                      ? `Opens ${new Date(a.cbt_open).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" })}`
                      : "CBT test is not available right now"}
                  </p>
                )}
              </>
            )}

            {/* Submit written assignment — snap a photo, paste a link, or mark done */}
            {s.status === "pending" && a.type !== "cbt" && (
              <div className="mt-4 space-y-3">
                {/* Snap / upload a photo of handwritten work */}
                <label className={`flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-line py-3 text-sm font-semibold text-ink/60 transition hover:border-gold hover:text-ink ${uploading === s.id ? "opacity-50" : ""}`}>
                  {uploading === s.id ? "Uploading…" : "Snap or upload a photo of your work"}
                  <input type="file" accept="image/*" capture="environment" className="hidden"
                    disabled={uploading === s.id}
                    onChange={e => { const f = e.target.files?.[0]; if (f) uploadAndSubmit(s.id, f); }} />
                </label>

                <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-ink/30">
                  <span className="h-px flex-1 bg-line" /> or <span className="h-px flex-1 bg-line" />
                </div>

                {/* Paste a link */}
                <input className="field" placeholder="Paste a link (GitHub, Replit, Colab, Google Doc…)"
                  value={links[s.id] || ""} onChange={e => setLinks(l => ({ ...l, [s.id]: e.target.value }))} />
                <button className="btn-gold w-full" onClick={() => markSubmitted(s.id)} disabled={uploading === s.id}>
                  Submit link / mark as done
                </button>
              </div>
            )}

            {/* Submit for external CBT after taking it */}
            {s.status === "pending" && a.type === "cbt" && hasExternalCBT && !hasInlineCBT && (
              <button className="btn-gold mt-2 w-full" onClick={() => markSubmitted(s.id)}>I've completed the external test</button>
            )}
          </article>
        );
      })}
      {!items.length && <div className="card p-12 text-center text-ink/40">No assignments yet — they'll appear here once your tutor posts them.</div>}
    </div>
  );
}
