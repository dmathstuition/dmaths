"use client";
import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import ConfirmModal from "@/components/ConfirmModal";
import { useToast } from "@/components/Toast";

type ConfirmState = {
  title: string; message: string; confirmLabel?: string; danger?: boolean; onConfirm: () => void;
};

export default function AssignmentsClient({ initial }: { initial: any[] }) {
  const supabase = supabaseBrowser();
  const push = useToast();
  const [items, setItems] = useState<any[]>(initial);
  const [links, setLinks] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState<string | null>(null);
  const [uploadPct, setUploadPct] = useState(0);
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);

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
    if (file.size > 10 * 1024 * 1024) { push("Photo too large — 10 MB maximum.", "error"); return; }
    setUploading(submissionId);
    setUploadPct(0);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("bucket", "submissions");
    fd.append("folder", submissionId);

    const result = await new Promise<{ url?: string; error?: string }>((resolve) => {
      const xhr = new XMLHttpRequest();
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) setUploadPct(Math.round((e.loaded / e.total) * 100));
      };
      xhr.onload = () => {
        try {
          const json = JSON.parse(xhr.responseText);
          if (xhr.status >= 200 && xhr.status < 300) resolve({ url: json.url });
          else resolve({ error: json.error || "Upload failed" });
        } catch {
          resolve({ error: "Upload failed" });
        }
      };
      xhr.onerror = () => resolve({ error: "Upload failed — check your connection." });
      xhr.open("POST", "/api/upload");
      xhr.send(fd);
    });

    if (result.error) {
      push(result.error, "error");
      setUploadPct(0);
      setUploading(null);
      return;
    }

    await supabase.from("assignment_submissions")
      .update({ status: "submitted", submitted_at: new Date().toISOString(), file_url: result.url })
      .eq("id", submissionId);
    setUploadPct(0);
    setUploading(null);
    reload();
  }

  function markSubmitted(id: string) {
    const link = (links[id] || "").trim();
    if (link && !/^https?:\/\//i.test(link)) {
      push("Please enter a full link starting with http:// or https://", "error");
      return;
    }
    setConfirmState({
      title: "Submit assignment?",
      message: "Your tutor will see it for grading.",
      confirmLabel: "Submit",
      onConfirm: async () => {
        setConfirmState(null);
        await supabase.from("assignment_submissions")
          .update({ status: "submitted", submitted_at: new Date().toISOString(), submission_link: link })
          .eq("id", id);
        reload();
      },
    });
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

            {a.file_url && (
              <a href={a.file_url} target="_blank" rel="noopener noreferrer"
                className="mt-3 flex items-center gap-2 rounded-xl border border-line px-4 py-2.5 text-sm font-semibold text-gold-deep hover:bg-chalk">
                {a.file_name || "Assignment PDF"} — tap to view
              </a>
            )}

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

            {s.status === "graded" && (
              <div className="mt-4 rounded-xl border-l-4 border-l-emerald-500 bg-emerald-50 px-4 py-3">
                <p className="text-sm font-extrabold text-emerald-900">Grade: {s.grade}/100</p>
                {s.feedback && <p className="mt-1 text-sm text-emerald-900/80">{s.feedback}</p>}
              </div>
            )}

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

            {s.status === "pending" && a.type !== "cbt" && (
              <div className="mt-4 space-y-3">
                <label className={`flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-line py-3 text-sm font-semibold text-ink/60 transition hover:border-gold hover:text-ink ${uploading === s.id ? "opacity-50" : ""}`}>
                  {uploading === s.id ? "Uploading…" : "Snap or upload a photo of your work"}
                  <input type="file" accept="image/*" capture="environment" className="hidden"
                    disabled={uploading === s.id}
                    onChange={e => { const f = e.target.files?.[0]; if (f) uploadAndSubmit(s.id, f); }} />
                </label>

                {uploading === s.id && uploadPct > 0 && uploadPct < 100 && (
                  <div className="h-1.5 w-full rounded-full bg-line">
                    <div className="h-full rounded-full bg-gold transition-all" style={{ width: `${uploadPct}%` }} />
                  </div>
                )}

                <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-ink/30">
                  <span className="h-px flex-1 bg-line" /> or <span className="h-px flex-1 bg-line" />
                </div>

                <input className="field" placeholder="Paste a link (GitHub, Replit, Colab, Google Doc…)"
                  value={links[s.id] || ""} onChange={e => setLinks(l => ({ ...l, [s.id]: e.target.value }))} />
                <button className="btn-gold w-full" onClick={() => markSubmitted(s.id)} disabled={uploading === s.id}>
                  Submit link / mark as done
                </button>
              </div>
            )}

            {s.status === "pending" && a.type === "cbt" && hasExternalCBT && !hasInlineCBT && (
              <button className="btn-gold mt-2 w-full" onClick={() => markSubmitted(s.id)}>I've completed the external test</button>
            )}
          </article>
        );
      })}
      {!items.length && <div className="card p-12 text-center text-ink/40">No assignments yet — they'll appear here once your tutor posts them.</div>}

      {confirmState && (
        <ConfirmModal {...confirmState} onCancel={() => setConfirmState(null)} />
      )}
    </div>
  );
}
