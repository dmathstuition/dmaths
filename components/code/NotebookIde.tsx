"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { useToast } from "@/components/Toast";
import CodeArea from "@/components/code/CodeArea";
import { python } from "@/components/code/highlighters";

type Snippet = { id: string; title: string; code: string; shared?: boolean; shared_by_name?: string | null };
type Output =
  | { kind: "stream"; name: "stdout" | "stderr"; text: string }
  | { kind: "text"; text: string }
  | { kind: "error"; text: string }
  | { kind: "image"; b64: string }
  | { kind: "html"; html: string };
type Cell = { id: string; type: "code" | "markdown"; source: string; outputs: Output[]; count: number | null; running?: boolean; editing?: boolean };

let _id = 0;
const uid = () => `c${Date.now().toString(36)}${_id++}`;

const WELCOME: Cell[] = [
  { id: uid(), type: "markdown", source: "# My notebook\nRun cells with **Shift + Enter**. Variables you make in one cell can be used in the next — just like Colab or Jupyter. Try plotting or a table below! 📊", outputs: [], count: null },
  { id: uid(), type: "code", source: "import numpy as np\n\nx = np.linspace(0, 10, 200)\ny = np.sin(x)\ny[:5]", outputs: [], count: null },
  { id: uid(), type: "code", source: "import matplotlib.pyplot as plt\n\nplt.plot(x, y)\nplt.title(\"y = sin(x)\")\nplt.show()", outputs: [], count: null },
];

// Escape then apply a tiny, safe subset of Markdown (headings, bold, italic,
// inline code, links, unordered lists). Content is the author's own, shown only
// to them, but we escape first so nothing can inject markup.
function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function renderMarkdown(src: string): string {
  const inline = (t: string) => t
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
  const lines = escapeHtml(src).split("\n");
  let html = "", inList = false;
  for (const line of lines) {
    const h = line.match(/^(#{1,3})\s+(.*)$/);
    const li = line.match(/^[-*]\s+(.*)$/);
    if (h) { if (inList) { html += "</ul>"; inList = false; } html += `<h${h[1].length}>${inline(h[2])}</h${h[1].length}>`; }
    else if (li) { if (!inList) { html += "<ul>"; inList = true; } html += `<li>${inline(li[1])}</li>`; }
    else if (line.trim() === "") { if (inList) { html += "</ul>"; inList = false; } }
    else { if (inList) { html += "</ul>"; inList = false; } html += `<p>${inline(line)}</p>`; }
  }
  if (inList) html += "</ul>";
  return html || "<p class='dmaths-nb-empty'>Empty markdown cell — double-click to edit.</p>";
}

export default function NotebookIde({ persist = false, meId = "", initialNotebooks = [], sharedNotebooks = [], canShare = false }: {
  persist?: boolean; meId?: string; initialNotebooks?: Snippet[]; sharedNotebooks?: Snippet[]; canShare?: boolean;
}) {
  const push = useToast();
  const [cells, setCells] = useState<Cell[]>(WELCOME);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "running">("idle");
  const [notebooks, setNotebooks] = useState<Snippet[]>(initialNotebooks);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [title, setTitle] = useState("Untitled notebook");
  const [saving, setSaving] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const worker = useRef<Worker | null>(null);
  const pending = useRef<{ id: string; resolve: () => void } | null>(null);
  const execCount = useRef(0);
  const cellsRef = useRef(cells);
  useEffect(() => { cellsRef.current = cells; }, [cells]);

  const patch = useCallback((id: string, fn: (c: Cell) => Cell) =>
    setCells((cs) => cs.map((c) => (c.id === id ? fn(c) : c))), []);

  const appendOut = useCallback((id: string, o: Output) =>
    patch(id, (c) => {
      if (o.kind === "stream") {
        const last = c.outputs[c.outputs.length - 1];
        if (last && last.kind === "stream" && last.name === o.name)
          return { ...c, outputs: [...c.outputs.slice(0, -1), { ...last, text: last.text + o.text }] };
      }
      return { ...c, outputs: [...c.outputs, o] };
    }), [patch]);

  const ensureWorker = useCallback(() => {
    if (worker.current) return worker.current;
    const w = new Worker("/pyodide-notebook-worker.js");
    w.onmessage = (e) => {
      const m = e.data || {};
      switch (m.type) {
        case "status": setStatus(m.text === "loading" ? "loading" : "idle"); break;
        case "ready": case "restarted": setStatus("ready"); break;
        case "running": setStatus("running"); break;
        case "fatal": setStatus("ready"); if (m.cell) appendOut(m.cell, { kind: "error", text: m.text }); break;
        case "stream": appendOut(m.cell, { kind: "stream", name: m.name, text: m.text }); break;
        case "image": appendOut(m.cell, { kind: "image", b64: m.b64 }); break;
        case "html": appendOut(m.cell, { kind: "html", html: m.html }); break;
        case "result": appendOut(m.cell, { kind: "text", text: m.text }); break;
        case "error": appendOut(m.cell, { kind: "error", text: m.text }); break;
        case "done": {
          const n = (execCount.current += 1);
          patch(m.cell, (c) => ({ ...c, running: false, count: n }));
          setStatus("ready");
          if (pending.current?.id === m.cell) { const p = pending.current; pending.current = null; p.resolve(); }
          break;
        }
      }
    };
    worker.current = w;
    return w;
  }, [appendOut, patch]);

  useEffect(() => () => worker.current?.terminate(), []);

  const runCell = useCallback((id: string): Promise<void> => {
    const cell = cellsRef.current.find((c) => c.id === id);
    if (!cell) return Promise.resolve();
    if (cell.type === "markdown") { patch(id, (c) => ({ ...c, editing: false })); return Promise.resolve(); }
    const w = ensureWorker();
    if (status === "idle") setStatus("loading");
    patch(id, (c) => ({ ...c, outputs: [], running: true, count: null }));
    return new Promise((resolve) => {
      pending.current = { id, resolve };
      w.postMessage({ type: "run", cell: id, code: cell.source });
    });
  }, [ensureWorker, patch, status]);

  async function runAll() {
    for (const c of cellsRef.current) if (c.type === "code") await runCell(c.id); // eslint-disable-line no-await-in-loop
  }

  function restart() {
    worker.current?.terminate();
    worker.current = null;
    pending.current = null;
    execCount.current = 0;
    setStatus("idle");
    setCells((cs) => cs.map((c) => ({ ...c, count: null, running: false })));
    push("Kernel restarted — variables cleared.", "success");
  }

  function clearOutputs() {
    setCells((cs) => cs.map((c) => ({ ...c, outputs: [], count: null })));
  }

  // ── Cell operations ──────────────────────────────────────────────
  const update = (id: string, source: string) => patch(id, (c) => ({ ...c, source }));
  function addCell(afterId: string | null, type: "code" | "markdown") {
    const cell: Cell = { id: uid(), type, source: "", outputs: [], count: null, editing: type === "markdown" };
    setCells((cs) => {
      if (afterId === null) return [...cs, cell];
      const i = cs.findIndex((c) => c.id === afterId);
      return [...cs.slice(0, i + 1), cell, ...cs.slice(i + 1)];
    });
  }
  function delCell(id: string) { setCells((cs) => (cs.length <= 1 ? cs : cs.filter((c) => c.id !== id))); }
  function move(id: string, dir: -1 | 1) {
    setCells((cs) => {
      const i = cs.findIndex((c) => c.id === id);
      const j = i + dir;
      if (j < 0 || j >= cs.length) return cs;
      const next = [...cs];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }

  function codeKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>, id: string) {
    if (e.key === "Tab") {
      e.preventDefault();
      const ta = e.currentTarget; const s = ta.selectionStart, en = ta.selectionEnd;
      const v = ta.value;
      update(id, v.slice(0, s) + "    " + v.slice(en));
      requestAnimationFrame(() => { ta.selectionStart = ta.selectionEnd = s + 4; });
    } else if (e.key === "Enter" && (e.shiftKey || e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      runCell(id);
    }
  }

  // ── Persistence (owner-scoped snippets, language "notebook") ──────
  const serialize = () => JSON.stringify(cells.map((c) => ({ type: c.type, source: c.source })));
  function load(nb: Snippet) {
    try {
      const parsed = JSON.parse(nb.code);
      const loaded: Cell[] = (Array.isArray(parsed) ? parsed : []).map((c: any) => ({
        id: uid(), type: c.type === "markdown" ? "markdown" : "code", source: String(c.source ?? ""), outputs: [], count: null,
      }));
      setCells(loaded.length ? loaded : WELCOME.map((c) => ({ ...c, id: uid(), outputs: [], count: null })));
      setActiveId(nb.id); setTitle(nb.title); restart();
    } catch { push("Could not open that notebook.", "error"); }
  }
  function newNotebook() {
    setCells(WELCOME.map((c) => ({ ...c, id: uid(), outputs: [], count: null })));
    setActiveId(null); setTitle("Untitled notebook"); restart();
  }
  async function save() {
    if (!persist || !meId) return;
    setSaving(true);
    const code = serialize();
    const t = title.trim() || "Untitled notebook";
    if (activeId) {
      const { error } = await supabaseBrowser().from("code_snippets")
        .update({ title: t, code, language: "notebook", updated_at: new Date().toISOString() }).eq("id", activeId);
      setSaving(false);
      if (error) { push(/code_snippets/i.test(error.message) ? "Run migration-code-snippets.sql in Supabase first." : "Could not save.", "error"); return; }
      setNotebooks((p) => p.map((s) => (s.id === activeId ? { ...s, title: t, code } : s)));
      push("Notebook saved.", "success");
    } else {
      const { data, error } = await supabaseBrowser().from("code_snippets")
        .insert({ user_id: meId, title: t, code, language: "notebook" }).select().single();
      setSaving(false);
      if (error || !data) { push(/code_snippets/i.test(error?.message ?? "") ? "Run migration-code-snippets.sql in Supabase first." : "Could not save.", "error"); return; }
      setNotebooks((p) => [{ id: data.id, title: data.title, code }, ...p]);
      setActiveId(data.id);
      push("Notebook saved.", "success");
    }
  }
  async function delNotebook(id: string) {
    if (!window.confirm("Delete this notebook?")) return;
    await supabaseBrowser().from("code_snippets").delete().eq("id", id);
    setNotebooks((p) => p.filter((s) => s.id !== id));
    if (activeId === id) newNotebook();
  }

  // Load someone else's shared notebook as a fresh copy (no activeId, so Save
  // creates the learner's own).
  function openShared(nb: Snippet) {
    try {
      const parsed = JSON.parse(nb.code);
      const loaded: Cell[] = (Array.isArray(parsed) ? parsed : []).map((c: any) => ({
        id: uid(), type: c.type === "markdown" ? "markdown" : "code", source: String(c.source ?? ""), outputs: [], count: null,
      }));
      setCells(loaded.length ? loaded : WELCOME.map((c) => ({ ...c, id: uid() })));
      setActiveId(null); setTitle(`${nb.title || "Notebook"} (copy)`); restart();
      push("Opened a copy — Save it to keep your own.", "success");
    } catch { push("Could not open that notebook.", "error"); }
  }

  const activeShared = notebooks.find((n) => n.id === activeId)?.shared ?? false;
  async function toggleShare() {
    if (!activeId) { push("Save the notebook first, then share it.", "error"); return; }
    const next = !activeShared;
    const res = await fetch("/api/notebooks/share", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ snippetId: activeId, shared: next }),
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) { push(j.error || "Could not update sharing.", "error"); return; }
    setNotebooks((p) => p.map((n) => (n.id === activeId ? { ...n, shared: next } : n)));
    push(next ? "Shared — your learners can now open a copy. 📤" : "Sharing turned off.", "success");
  }

  // ── .ipynb (real Jupyter/Colab format) ───────────────────────────
  function toLines(s: string): string[] {
    return s ? (s.match(/[^\n]*\n|[^\n]+$/g) ?? [s]) : [];
  }
  function download(name: string, text: string) {
    const url = URL.createObjectURL(new Blob([text], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url; a.download = name; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function exportIpynb() {
    const nb = {
      cells: cells.map((c) => c.type === "markdown"
        ? { cell_type: "markdown", metadata: {}, source: toLines(c.source) }
        : { cell_type: "code", metadata: {}, execution_count: null, outputs: [], source: toLines(c.source) }),
      metadata: { kernelspec: { name: "python3", display_name: "Python 3" }, language_info: { name: "python" } },
      nbformat: 4, nbformat_minor: 5,
    };
    download(`${(title.trim() || "notebook").replace(/[^\w.-]+/g, "_")}.ipynb`, JSON.stringify(nb, null, 1));
  }
  function importIpynb(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const nb = JSON.parse(String(reader.result));
        const cs: Cell[] = (Array.isArray(nb.cells) ? nb.cells : []).map((c: any) => ({
          id: uid(), type: c.cell_type === "markdown" ? "markdown" : "code",
          source: Array.isArray(c.source) ? c.source.join("") : String(c.source ?? ""), outputs: [], count: null,
        }));
        if (!cs.length) { push("That notebook has no cells.", "error"); return; }
        setCells(cs); setActiveId(null); setTitle((file.name || "notebook").replace(/\.ipynb$/i, "")); restart();
        push("Notebook imported — Save it to keep it.", "success");
      } catch { push("That doesn't look like a valid .ipynb file.", "error"); }
    };
    reader.readAsText(file);
  }

  const busy = status === "loading" || status === "running";
  const statusLabel = status === "loading" ? "Starting kernel…" : status === "running" ? "Running…" : status === "ready" ? "Kernel ready" : "Kernel idle";

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
      <style>{`
        .dmaths-nb-html table { border-collapse: collapse; font-size: 12.5px; }
        .dmaths-nb-html th, .dmaths-nb-html td { border: 1px solid var(--line, #e5e7eb); padding: 3px 8px; text-align: right; }
        .dmaths-nb-html thead th { background: #f4f6f8; }
        .dmaths-nb-md h1 { font-size: 1.4rem; font-weight: 800; margin: .3rem 0; }
        .dmaths-nb-md h2 { font-size: 1.15rem; font-weight: 800; margin: .3rem 0; }
        .dmaths-nb-md h3 { font-size: 1rem; font-weight: 700; margin: .3rem 0; }
        .dmaths-nb-md p { margin: .35rem 0; }
        .dmaths-nb-md ul { list-style: disc; margin: .3rem 0 .3rem 1.2rem; }
        .dmaths-nb-md code { background: rgba(0,0,0,.06); padding: 0 .25rem; border-radius: .25rem; font-family: ui-monospace, monospace; font-size: .85em; }
        .dmaths-nb-md a { color: #b8791b; text-decoration: underline; }
        .dmaths-nb-empty { color: rgba(0,0,0,.35); font-style: italic; }
      `}</style>

      <div className="min-w-0 space-y-3">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-line bg-white px-3 py-2 shadow-card">
          {persist && (
            <input value={title} onChange={(e) => setTitle(e.target.value)}
              className="min-w-0 flex-1 rounded-md bg-chalk/60 px-2 py-1.5 text-sm font-bold outline-none focus:bg-chalk" placeholder="Notebook title" />
          )}
          <button onClick={runAll} disabled={busy} className="btn-gold !min-h-[38px] !px-4 !text-sm">▶▶ Run all</button>
          <button onClick={restart} className="btn-ghost !min-h-[38px] !px-3 !text-sm">⟳ Restart</button>
          <button onClick={clearOutputs} className="btn-ghost !min-h-[38px] !px-3 !text-sm">Clear</button>
          {persist && <button onClick={save} disabled={saving} className="btn-ghost !min-h-[38px] !px-3 !text-sm">{saving ? "Saving…" : "Save"}</button>}
          {persist && canShare && (
            <button onClick={toggleShare} title="Share this notebook with your learners"
              className={`!min-h-[38px] !px-3 !text-sm ${activeShared ? "btn-gold" : "btn-ghost"}`}>
              {activeShared ? "✓ Shared" : "Share"}
            </button>
          )}
          <button onClick={exportIpynb} title="Download as a Jupyter/Colab .ipynb file" className="btn-ghost !min-h-[38px] !px-3 !text-sm">⬇ .ipynb</button>
          <button onClick={() => fileInput.current?.click()} title="Import a .ipynb file" className="btn-ghost !min-h-[38px] !px-3 !text-sm">⬆ Import</button>
          <input ref={fileInput} type="file" accept=".ipynb,application/json" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) importIpynb(f); e.currentTarget.value = ""; }} />
          <span className={`ml-auto flex items-center gap-1.5 text-[11px] font-semibold ${busy ? "text-gold-deep" : "text-ink/45"}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${status === "ready" ? "bg-emerald-500" : busy ? "bg-gold badge-pulse" : "bg-ink/30"}`} />
            {statusLabel}
          </span>
        </div>

        {/* Cells */}
        {cells.map((cell) => (
          <div key={cell.id} className="group rounded-xl border border-line bg-white shadow-card">
            <div className="flex items-stretch gap-2">
              {/* Left gutter: run + exec count */}
              <div className="flex w-12 flex-shrink-0 flex-col items-center gap-1 rounded-l-xl bg-chalk/50 py-2">
                <button onClick={() => runCell(cell.id)} title="Run (Shift+Enter)"
                  className="flex h-7 w-7 items-center justify-center rounded-full text-ink/50 transition hover:bg-gold hover:text-board">
                  {cell.running ? <span className="h-2 w-2 animate-ping rounded-full bg-gold-deep" /> : "▶"}
                </button>
                <span className="font-mono text-[10px] text-ink/35">{cell.type === "code" ? (cell.count != null ? `[${cell.count}]` : "[ ]") : "md"}</span>
              </div>

              {/* Body */}
              <div className="min-w-0 flex-1 py-2 pr-2">
                {cell.type === "code" ? (
                  <div className="overflow-hidden rounded-lg border border-line">
                    <CodeArea value={cell.source} onChange={(v) => update(cell.id, v)}
                      onKeyDown={(e) => codeKeyDown(e, cell.id)} highlight={python} minHeight={64} ariaLabel="Code cell" />
                  </div>
                ) : cell.editing ? (
                  <textarea autoFocus value={cell.source} onChange={(e) => update(cell.id, e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && e.shiftKey) { e.preventDefault(); patch(cell.id, (c) => ({ ...c, editing: false })); } }}
                    onBlur={() => patch(cell.id, (c) => ({ ...c, editing: false }))}
                    placeholder="Write notes in Markdown… (# heading, **bold**, - list)"
                    className="w-full resize-y rounded-lg border border-line bg-chalk/40 p-2.5 font-mono text-[13px] outline-none focus:border-gold" rows={3} />
                ) : (
                  <div className="dmaths-nb-md cursor-text px-1 text-[14px] leading-relaxed" onDoubleClick={() => patch(cell.id, (c) => ({ ...c, editing: true }))}
                    dangerouslySetInnerHTML={{ __html: renderMarkdown(cell.source) }} />
                )}

                {/* Outputs */}
                {cell.outputs.length > 0 && (
                  <div className="mt-2 space-y-1.5">
                    {cell.outputs.map((o, i) => <OutputView key={i} o={o} />)}
                  </div>
                )}
              </div>

              {/* Right gutter: cell actions (appear on hover) */}
              <div className="flex flex-col items-center gap-0.5 py-2 pr-1 opacity-0 transition group-hover:opacity-100">
                <IconBtn label="Move up" onClick={() => move(cell.id, -1)}>↑</IconBtn>
                <IconBtn label="Move down" onClick={() => move(cell.id, 1)}>↓</IconBtn>
                <IconBtn label="Delete cell" onClick={() => delCell(cell.id)} danger>✕</IconBtn>
              </div>
            </div>

            {/* Add-cell affordance */}
            <div className="flex justify-center gap-2 border-t border-line/60 py-1 opacity-0 transition group-hover:opacity-100">
              <button onClick={() => addCell(cell.id, "code")} className="text-[11px] font-bold text-gold-deep hover:underline">+ Code</button>
              <button onClick={() => addCell(cell.id, "markdown")} className="text-[11px] font-bold text-ink/45 hover:underline">+ Text</button>
            </div>
          </div>
        ))}

        <div className="flex justify-center gap-3">
          <button onClick={() => addCell(null, "code")} className="btn-ghost !min-h-[38px] !px-4 !text-sm">+ Code cell</button>
          <button onClick={() => addCell(null, "markdown")} className="btn-ghost !min-h-[38px] !px-4 !text-sm">+ Text cell</button>
        </div>
      </div>

      {/* Notebooks sidebar */}
      {persist && (
        <aside className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-sm font-bold">My notebooks</h2>
            <button onClick={newNotebook} className="text-xs font-bold text-gold-deep hover:underline">+ New</button>
          </div>
          <div className="space-y-1.5">
            {notebooks.length === 0 && <p className="text-sm text-ink/40">Save your first notebook to keep it here.</p>}
            {notebooks.map((s) => (
              <div key={s.id} className={`group flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition ${activeId === s.id ? "bg-gold text-board" : "bg-chalk hover:bg-chalk/70"}`}>
                <button onClick={() => load(s)} className="min-w-0 flex-1 truncate text-left font-semibold">{s.title}</button>
                <button onClick={() => delNotebook(s.id)} aria-label="Delete notebook"
                  className={`shrink-0 text-xs opacity-0 transition group-hover:opacity-100 ${activeId === s.id ? "text-board/70" : "text-red-500"}`}>✕</button>
              </div>
            ))}
          </div>
          {sharedNotebooks.length > 0 && (
            <div className="space-y-1.5 border-t border-line pt-3">
              <h2 className="font-display text-sm font-bold">📤 Shared with you</h2>
              {sharedNotebooks.map((s) => (
                <button key={s.id} onClick={() => openShared(s)}
                  className="block w-full rounded-xl bg-gold-pale px-3 py-2 text-left text-sm transition hover:bg-gold-pale/70">
                  <span className="block truncate font-semibold text-gold-deep">{s.title}</span>
                  {s.shared_by_name && <span className="block truncate text-[11px] text-ink/45">from {s.shared_by_name}</span>}
                </button>
              ))}
            </div>
          )}
          <p className="rounded-xl bg-chalk/60 p-3 text-[11px] leading-relaxed text-ink/45">
            A real Python kernel runs in your browser. Cells share state — define a variable once, use it anywhere. Try <code className="font-mono">numpy</code>, <code className="font-mono">pandas</code> and <code className="font-mono">matplotlib</code>.
          </p>
        </aside>
      )}
    </div>
  );
}

function IconBtn({ children, label, onClick, danger }: { children: React.ReactNode; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button onClick={onClick} aria-label={label} title={label}
      className={`flex h-6 w-6 items-center justify-center rounded-md text-xs transition hover:bg-chalk ${danger ? "text-red-500" : "text-ink/40"}`}>
      {children}
    </button>
  );
}

function OutputView({ o }: { o: Output }) {
  if (o.kind === "image") return <img alt="figure" src={`data:image/png;base64,${o.b64}`} className="max-w-full rounded-lg border border-line" />;
  if (o.kind === "html") return <div className="dmaths-nb-html overflow-auto rounded-lg border border-line bg-white p-2" dangerouslySetInnerHTML={{ __html: o.html }} />;
  const cls = o.kind === "error" || (o.kind === "stream" && o.name === "stderr")
    ? "bg-red-50 text-red-700"
    : o.kind === "text" ? "bg-emerald-50/60 text-ink" : "bg-[#0b2036] text-slate-100";
  return <pre className={`overflow-auto whitespace-pre-wrap rounded-lg px-3 py-2 font-mono text-[12.5px] leading-relaxed ${cls}`}>{o.text}</pre>;
}
