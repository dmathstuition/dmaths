"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { useToast } from "@/components/Toast";
import CodeArea from "@/components/code/CodeArea";
import { python } from "@/components/code/highlighters";

type Snippet = { id: string; title: string; code: string };
type Line = { stream: "out" | "err" | "sys"; text: string };

const STARTER = `# Welcome to the D-Maths Python playground!
# Write Python below, then press Run.

name = input("What's your name? ")
print("Hello,", name + "!")

for i in range(1, 6):
    print(i, "x", i, "=", i * i)
`;

export default function PythonIde({ persist = false, meId = "", initialSnippets = [] }: {
  persist?: boolean; meId?: string; initialSnippets?: Snippet[];
}) {
  const push = useToast();

  const [snippets, setSnippets] = useState<Snippet[]>(initialSnippets);
  const [activeId, setActiveId] = useState<string | null>(initialSnippets[0]?.id ?? null);
  const [title, setTitle] = useState(initialSnippets[0]?.title ?? "Untitled");
  const [code, setCode] = useState(initialSnippets[0]?.code ?? STARTER);
  const [stdin, setStdin] = useState("");
  const [output, setOutput] = useState<Line[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "running">("idle");
  const [saving, setSaving] = useState(false);

  const worker = useRef<Worker | null>(null);
  const outRef = useRef<HTMLDivElement>(null);
  const append = useCallback((line: Line) => setOutput((p) => [...p, line]), []);

  // Create the Pyodide worker lazily — only on the first Run — so merely opening
  // the page (or the Web tab) never downloads the ~10 MB Python engine.
  const ensureWorker = useCallback(() => {
    if (worker.current) return worker.current;
    const w = new Worker("/pyodide-worker.js");
    w.onmessage = (e) => {
      const m = e.data || {};
      if (m.type === "running") setStatus("running");
      else if (m.type === "out") append({ stream: "out", text: m.text });
      else if (m.type === "err") append({ stream: "err", text: m.text });
      else if (m.type === "done") setStatus("ready");
      else if (m.type === "fatal") { setStatus("ready"); append({ stream: "err", text: m.text }); }
    };
    worker.current = w;
    return w;
  }, [append]);

  useEffect(() => () => worker.current?.terminate(), []);
  useEffect(() => { outRef.current?.scrollTo({ top: outRef.current.scrollHeight }); }, [output]);

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Tab") {
      e.preventDefault();
      const ta = e.currentTarget;
      const s = ta.selectionStart, en = ta.selectionEnd;
      setCode(code.slice(0, s) + "    " + code.slice(en));
      requestAnimationFrame(() => { ta.selectionStart = ta.selectionEnd = s + 4; });
    }
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); run(); }
  }

  function run() {
    if (status === "loading" || status === "running") return;
    setOutput([]);
    const first = !worker.current;
    const w = ensureWorker();
    setStatus("loading");
    if (first) append({ stream: "sys", text: "Loading Python… the first run downloads the engine (a few seconds)." });
    w.postMessage({ type: "run", code, stdin });
  }

  function stop() {
    worker.current?.terminate();
    worker.current = null;
    setStatus("idle");
    append({ stream: "sys", text: "⏹ Stopped." });
  }

  // ── Snippets (only when persisted + signed in) ────────────────────
  async function save() {
    if (!persist || !meId) return;
    setSaving(true);
    if (activeId) {
      const { error } = await supabaseBrowser().from("code_snippets")
        .update({ title: title.trim() || "Untitled", code, updated_at: new Date().toISOString() })
        .eq("id", activeId);
      setSaving(false);
      if (error) { push(/code_snippets/i.test(error.message) ? "Run migration-code-snippets.sql in Supabase first." : "Could not save.", "error"); return; }
      setSnippets((p) => p.map((s) => (s.id === activeId ? { ...s, title: title.trim() || "Untitled", code } : s)));
      push("Saved.", "success");
    } else {
      const { data, error } = await supabaseBrowser().from("code_snippets")
        .insert({ user_id: meId, title: title.trim() || "Untitled", code, language: "python" }).select().single();
      setSaving(false);
      if (error || !data) { push(/code_snippets/i.test(error?.message ?? "") ? "Run migration-code-snippets.sql in Supabase first." : "Could not save.", "error"); return; }
      setSnippets((p) => [{ id: data.id, title: data.title, code: data.code }, ...p]);
      setActiveId(data.id);
      push("Saved.", "success");
    }
  }

  function openSnippet(s: Snippet) { setActiveId(s.id); setTitle(s.title); setCode(s.code); setOutput([]); }
  function newSnippet() { setActiveId(null); setTitle("Untitled"); setCode(STARTER); setOutput([]); }
  async function delSnippet(id: string) {
    if (!window.confirm("Delete this snippet?")) return;
    await supabaseBrowser().from("code_snippets").delete().eq("id", id);
    setSnippets((p) => p.filter((s) => s.id !== id));
    if (activeId === id) newSnippet();
  }

  const busy = status === "loading" || status === "running";
  const statusLabel = status === "loading" ? "Loading Python…" : status === "running" ? "Running…" : status === "ready" ? "Ready" : "Idle";

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
      <div className="min-w-0 space-y-4">
        {/* Editor */}
        <div className="overflow-hidden rounded-xl border border-line shadow-card">
          <div className="flex flex-wrap items-center gap-2 border-b border-line bg-board px-3 py-2">
            <span className="flex gap-1.5">
              <span className="h-3 w-3 rounded-full bg-red-400" /><span className="h-3 w-3 rounded-full bg-amber-400" /><span className="h-3 w-3 rounded-full bg-emerald-400" />
            </span>
            {persist ? (
              <input value={title} onChange={(e) => setTitle(e.target.value)}
                className="ml-1 min-w-0 flex-1 rounded-md bg-white/10 px-2 py-1 text-sm font-semibold text-white placeholder-white/40 outline-none" placeholder="Snippet title" />
            ) : (
              <span className="ml-1 font-mono text-xs text-white/60">main.py</span>
            )}
            <span className={`ml-auto flex items-center gap-1.5 text-[11px] font-semibold ${busy ? "text-gold" : "text-white/50"}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${status === "ready" ? "bg-emerald-400" : busy ? "bg-gold badge-pulse" : "bg-white/40"}`} />
              {statusLabel}
            </span>
          </div>
          <CodeArea value={code} onChange={setCode} onKeyDown={onKeyDown} highlight={python} minHeight={320} ariaLabel="Python code editor" />
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {busy ? (
            <button onClick={stop} className="btn-danger !min-h-[42px] !px-5">■ Stop</button>
          ) : (
            <button onClick={run} className="btn-gold !min-h-[42px] !px-6">▶ Run</button>
          )}
          {persist && (
            <button onClick={save} disabled={saving} className="btn-ghost !min-h-[42px]">{saving ? "Saving…" : "Save"}</button>
          )}
          <button onClick={() => setOutput([])} className="btn-ghost !min-h-[42px]">Clear output</button>
          <span className="ml-auto hidden text-xs text-ink/40 sm:block">Tip: Ctrl/⌘ + Enter to run</span>
        </div>

        {/* Input (stdin) — one value per line, consumed by input() */}
        <div>
          <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-ink/40">Input (for input()) — one value per line</label>
          <textarea value={stdin} onChange={(e) => setStdin(e.target.value)} rows={2} spellCheck={false}
            placeholder="Type here what your program should read with input(), one per line…"
            className="field w-full resize-y font-mono text-[13px]" />
        </div>

        {/* Output console */}
        <div ref={outRef} className="h-52 overflow-auto rounded-xl border border-line bg-[#0b2036] p-4 font-mono text-[13px] leading-relaxed">
          {output.length === 0 ? (
            <p className="text-white/35">Output will appear here.</p>
          ) : (
            output.map((l, i) => (
              <div key={i} className={`whitespace-pre-wrap ${l.stream === "err" ? "text-red-300" : l.stream === "sys" ? "text-gold/80 italic" : "text-slate-100"}`}>{l.text}</div>
            ))
          )}
        </div>
      </div>

      {/* Snippets sidebar */}
      {persist && (
        <aside className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-sm font-bold">My snippets</h2>
            <button onClick={newSnippet} className="text-xs font-bold text-gold-deep hover:underline">+ New</button>
          </div>
          <div className="space-y-1.5">
            {snippets.length === 0 && <p className="text-sm text-ink/40">Save your first snippet to keep it here.</p>}
            {snippets.map((s) => (
              <div key={s.id} className={`group flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition ${activeId === s.id ? "bg-gold text-board" : "bg-chalk hover:bg-chalk/70"}`}>
                <button onClick={() => openSnippet(s)} className="min-w-0 flex-1 truncate text-left font-semibold">{s.title}</button>
                <button onClick={() => delSnippet(s.id)} aria-label="Delete snippet"
                  className={`shrink-0 text-xs opacity-0 transition group-hover:opacity-100 ${activeId === s.id ? "text-board/70" : "text-red-500"}`}>✕</button>
              </div>
            ))}
          </div>
        </aside>
      )}
    </div>
  );
}
