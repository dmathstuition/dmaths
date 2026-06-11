"use client";
import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";

export default function AssignmentsClient({ initial }: { initial: any[] }) {
  const supabase = supabaseBrowser();
  const [items, setItems] = useState<any[]>(initial);

  async function reload() {
    const { data: { user } } = await supabase.auth.getUser();
    const { data } = await supabase
      .from("assignment_submissions")
      .select("*, assignment:assignments(*)")
      .eq("student_id", user!.id)
      .order("id", { ascending: false });
    setItems(data ?? []);
  }

  async function markSubmitted(id: string) {
    if (!confirm("Mark this assignment as submitted? Your tutor will see it for grading.")) return;
    await supabase.from("assignment_submissions")
      .update({ status: "submitted", submitted_at: new Date().toISOString() })
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
                  {a.type === "cbt" && <span className="pill-blue ml-1">🖥 CBT</span>}
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
                📎 {a.file_name || "Assignment PDF"} — tap to view
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
                    <a href={`/portal/cbt/${s.id}`} className="btn-ink mt-4 block w-full text-center">🖥 Start CBT test ({a.cbt_questions.length} questions)</a>
                  ) : hasExternalCBT ? (
                    <a href={a.cbt_link} target="_blank" rel="noopener noreferrer" className="btn-ink mt-4 block w-full text-center">🖥 Open CBT test</a>
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

            {/* Submit written assignment */}
            {s.status === "pending" && a.type !== "cbt" && (
              <button className="btn-gold mt-4" onClick={() => markSubmitted(s.id)}>Mark as submitted</button>
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
