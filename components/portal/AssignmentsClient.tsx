"use client";
import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import ConfirmModal from "@/components/ConfirmModal";
import { useToast } from "@/components/Toast";
import { Icon, type IconName } from "@/components/Icons";
import EmptyState from "@/components/ui/EmptyState";
import { fmtWAT } from "@/lib/time";
import PythonIde from "@/components/code/PythonIde";
import WebIde from "@/components/code/WebIde";
import { codeDisplay } from "@/lib/codeSubmission";
import { useAssistantTask } from "@/components/portal/AssistantContext";

type ConfirmState = {
  title: string; message: string; confirmLabel?: string; danger?: boolean; onConfirm: () => void;
};

const FILTERS = [
  { key: "all", label: "All" },
  { key: "todo", label: "To do" },
  { key: "submitted", label: "Submitted" },
  { key: "graded", label: "Graded" },
] as const;
type FilterKey = (typeof FILTERS)[number]["key"];
const bucketOf = (status: string): FilterKey => (status === "pending" ? "todo" : (status as FilterKey));

export default function AssignmentsClient({ initial }: { initial: any[] }) {
  const supabase = supabaseBrowser();
  const push = useToast();
  const [items, setItems] = useState<any[]>(initial);
  const [links, setLinks] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState<string | null>(null);
  const [uploadPct, setUploadPct] = useState(0);
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);
  const [filter, setFilter] = useState<FilterKey>("all");
  const [openCode, setOpenCode] = useState<string | null>(null); // submission id with the code editor open
  const { setTask } = useAssistantTask();

  // Tell the floating assistant which coding task the learner just opened, so its
  // hints are about this exact question. Cleared when the editor closes/submits.
  function openCodeEditor(sub: any) {
    const a = sub.assignment;
    const lang = a?.code_language === "web" ? "Web (HTML/CSS/JS)" : "Python";
    setTask(`Coding assignment "${a?.title}" (${lang}${a?.subject ? `, ${a.subject}` : ""}).${a?.instructions ? ` Instructions: ${a.instructions}` : ""}`);
    setOpenCode(sub.id);
  }

  async function submitCode(submissionId: string, code: string) {
    const { error } = await supabase.from("assignment_submissions")
      .update({ status: "submitted", submitted_at: new Date().toISOString(), code })
      .eq("id", submissionId);
    if (error) { push("Could not submit — try again.", "error"); return; }
    push("Answer submitted! 🎉", "success");
    setOpenCode(null);
    setTask(undefined);
    reload();
  }

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

  const counts = {
    all: items.length,
    todo: items.filter(s => bucketOf(s.status) === "todo").length,
    submitted: items.filter(s => bucketOf(s.status) === "submitted").length,
    graded: items.filter(s => bucketOf(s.status) === "graded").length,
  } as Record<FilterKey, number>;
  const visible = filter === "all" ? items : items.filter(s => bucketOf(s.status) === filter);

  const STATUS_ICON: Record<string, { icon: IconName; cls: string }> = {
    graded: { icon: "checkCircle", cls: "bg-emerald-50 text-emerald-600" },
    submitted: { icon: "assignments", cls: "bg-blue-50 text-blue-600" },
    pending: { icon: "assignments", cls: "bg-gold-pale text-gold-deep" },
  };

  return (
    <div className="space-y-5">
      <div data-tour="assignments-intro">
        <h1 className="font-display text-3xl font-semibold">Assignments</h1>
        <p className="text-sm text-ink/45">Submit your work and see your grades.</p>
      </div>

      {/* Filter tabs */}
      <div data-tour="assignments-filters" className="flex flex-wrap gap-2">
        {FILTERS.map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            className={`rounded-full px-4 py-1.5 text-[13px] font-bold transition ${
              filter === f.key ? "bg-ink text-white" : "border border-line bg-white text-ink/60 hover:bg-chalk"
            }`}>
            {f.label} <span className="opacity-60">{counts[f.key]}</span>
          </button>
        ))}
      </div>

      {visible.map(s => {
        const a = s.assignment;
        const st = STATUS_ICON[s.status] ?? STATUS_ICON.pending;
        const now = new Date();
        // Deadline: due_at is the exact WAT deadline; legacy rows may only have due_date.
        const deadline = a.due_at ? new Date(a.due_at).getTime() : null;
        const overdue = s.status === "pending" && deadline !== null && now.getTime() > deadline;
        const cbtOpen = a.type === "cbt" &&
          (!a.cbt_open || now >= new Date(a.cbt_open)) &&
          (!a.cbt_close || now <= new Date(a.cbt_close));
        const hasInlineCBT = a.cbt_questions?.length > 0;
        const hasExternalCBT = a.cbt_link;

        return (
          <article key={s.id} className="card p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <span className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl ${st.cls}`}>
                  <Icon name={st.icon} className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="font-extrabold">
                    {a.title}
                    {a.type === "cbt" && <span className="pill-blue ml-1">CBT</span>}
                    {a.type === "code" && <span className="pill ml-1 bg-purple-100 text-purple-800">{a.code_language === "web" ? "Web" : "Python"} code</span>}
                    {hasInlineCBT && <span className="pill ml-1 bg-purple-100 text-purple-800">{a.cbt_questions.length} Qs</span>}
                  </h2>
                  <p className="text-sm text-ink/45">
                    {a.subject} · Due {a.due_at
                      ? `${fmtWAT(a.due_at)} WAT`
                      : a.due_date ? new Date(a.due_date).toLocaleDateString("en-NG", { timeZone: "Africa/Lagos", dateStyle: "medium" }) : "TBD"}
                  </p>
                </div>
              </div>
              <span className="flex flex-col items-end gap-1">
                <span className={s.status === "graded" ? "pill-green" : s.status === "submitted" ? "pill-blue" : "pill-amber"}>{s.status}</span>
                {overdue && <span className="pill-red">⏰ overdue</span>}
              </span>
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

            {s.status === "pending" && a.type !== "cbt" && overdue && (
              <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-center text-sm font-bold text-red-800">
                ⏰ The deadline has passed — submissions are closed. Contact your tutor if you still need to hand this in.
              </p>
            )}

            {/* Coding assignment — code the answer in the embedded IDE */}
            {s.status === "pending" && a.type === "code" && !overdue && (
              <div className="mt-4">
                {openCode === s.id ? (
                  a.code_language === "web"
                    ? <WebIde persist={false} initialCode={a.starter_code || undefined} onSubmit={(c) => submitCode(s.id, c)} />
                    : <PythonIde persist={false} initialCode={a.starter_code || undefined} onSubmit={(c) => submitCode(s.id, c)} />
                ) : (
                  <button className="btn-gold w-full" onClick={() => openCodeEditor(s)}>
                    {"</>"} Open the code editor
                  </button>
                )}
              </div>
            )}

            {/* View submitted code (once submitted / graded) */}
            {a.type === "code" && s.code && s.status !== "pending" && (
              <details className="mt-3">
                <summary className="cursor-pointer text-sm font-semibold text-gold-deep">View your submitted code</summary>
                <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap rounded-xl bg-[#0b2036] p-4 font-mono text-[12.5px] text-slate-100">{codeDisplay(s.code, a.code_language)}</pre>
              </details>
            )}

            {s.status === "pending" && a.type !== "cbt" && a.type !== "code" && !overdue && (
              <div data-tour="assignments-submit" className="mt-4 space-y-3">
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
      {!items.length && (
        <EmptyState icon="assignments" title="No assignments yet"
          body="When your tutor posts homework or a CBT test, it'll appear here for you to complete and submit." />
      )}
      {items.length > 0 && !visible.length && (
        <EmptyState icon="checkCircle" title={`Nothing in "${FILTERS.find(f => f.key === filter)?.label}"`}
          body="Try another tab above." />
      )}

      {confirmState && (
        <ConfirmModal {...confirmState} onCancel={() => setConfirmState(null)} />
      )}
    </div>
  );
}
