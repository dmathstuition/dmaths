"use client";
import { useState } from "react";
import { getClientId, formatDate, type BlogComment } from "@/lib/blog";

// Public comments. Approved comments are rendered from the server; visitors can
// add a comment, which is held for moderation before it appears.
export default function Comments({ postId, initial }: { postId: string; initial: BlogComment[] }) {
  const [comments] = useState<BlogComment[]>(initial);
  const [name, setName] = useState("");
  const [body, setBody] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");
  const [msg, setMsg] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) { setState("error"); setMsg("Please write a comment first."); return; }
    setState("busy");
    try {
      const res = await fetch("/api/blog/comment", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId, authorName: name, body, clientId: getClientId() }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) { setState("error"); setMsg(j.error || "Something went wrong — please try again."); return; }
      setState("done"); setMsg(j.message || "Thanks! Your comment will appear once approved.");
      setBody(""); setName("");
    } catch { setState("error"); setMsg("Network error — please try again."); }
  }

  return (
    <div className="space-y-6">
      <h2 className="font-display text-xl font-bold text-ink">
        Comments {comments.length > 0 && <span className="text-ink/40">({comments.length})</span>}
      </h2>

      {comments.length === 0 ? (
        <p className="text-sm text-ink/50">No comments yet — be the first to share your thoughts.</p>
      ) : (
        <ul className="space-y-4">
          {comments.map((c) => (
            <li key={c.id} className="glass-card p-4">
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gold/15 text-[13px] font-bold text-gold-deep">
                  {(c.author_name || "A").trim().charAt(0).toUpperCase()}
                </span>
                <div>
                  <p className="text-sm font-bold text-ink">{c.author_name || "Anonymous"}</p>
                  <p className="text-[12px] text-ink/40">{formatDate(c.created_at)}</p>
                </div>
              </div>
              <p className="mt-3 whitespace-pre-wrap text-[14px] leading-relaxed text-ink/70">{c.body}</p>
            </li>
          ))}
        </ul>
      )}

      {/* Add a comment */}
      <div className="glass-card p-5">
        <h3 className="font-display text-base font-bold text-ink">Leave a comment</h3>
        {state === "done" ? (
          <p className="mt-3 rounded-xl border border-gold/40 bg-gold/10 px-4 py-3 text-sm font-semibold text-ink/75">{msg}</p>
        ) : (
          <form onSubmit={submit} className="mt-3 space-y-3">
            <input value={name} onChange={(e) => { setName(e.target.value); if (state === "error") setState("idle"); }}
              placeholder="Your name (optional)" maxLength={60}
              className="w-full rounded-xl border border-line bg-white px-4 py-2.5 text-sm text-ink outline-none transition focus:border-gold focus:ring-2 focus:ring-gold/30" />
            <textarea value={body} onChange={(e) => { setBody(e.target.value); if (state === "error") setState("idle"); }}
              placeholder="Write your comment…" rows={4} maxLength={2000}
              className="w-full rounded-xl border border-line bg-white px-4 py-2.5 text-sm text-ink outline-none transition focus:border-gold focus:ring-2 focus:ring-gold/30" />
            {state === "error" && <p className="text-[13px] font-semibold text-red-600">{msg}</p>}
            <div className="flex items-center gap-3">
              <button type="submit" disabled={state === "busy"} className="btn-gold !rounded-full !px-6 disabled:opacity-60">
                {state === "busy" ? "Posting…" : "Post comment"}
              </button>
              <span className="text-[12px] text-ink/40">Comments are reviewed before they appear.</span>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
