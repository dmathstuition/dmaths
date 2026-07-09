"use client";
import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { useToast } from "@/components/Toast";
import CodeArea from "@/components/code/CodeArea";
import { html as hlHtml, css as hlCss, javascript as hlJs } from "@/components/code/highlighters";

type Snippet = { id: string; title: string; code: string };
type Doc = { html: string; css: string; js: string };

const STARTER: Doc = {
  html: `<h1 id="title">Hello, D-Maths!</h1>
<p>Edit the HTML, CSS and JS, then press Run.</p>
<button onclick="cheer()">Click me</button>`,
  css: `body { font-family: system-ui, sans-serif; text-align: center; padding: 2rem; color: #0f3a6b; }
h1 { color: #c8881f; }
button { background: #efae56; border: 0; padding: .6rem 1.2rem; border-radius: 999px; font-weight: 700; cursor: pointer; }`,
  js: `let count = 0;
function cheer() {
  count += 1;
  document.getElementById("title").textContent = "You clicked " + count + " time(s)!";
  console.log("clicked", count);
}`,
};

// Console shim injected into the preview so console.log + errors surface in our panel.
const SHIM = `<script>(function(){
  var send=function(l,a){try{parent.postMessage({__web:1,level:l,text:Array.prototype.map.call(a,function(x){try{return typeof x==='object'?JSON.stringify(x):String(x)}catch(e){return String(x)}}).join(' ')},'*')}catch(e){}};
  ['log','info','warn','error'].forEach(function(l){var o=console[l]?console[l].bind(console):function(){};console[l]=function(){send(l,arguments);o.apply(null,arguments)};});
  window.addEventListener('error',function(e){send('error',[e.message]);});
})();<\/script>`;

function buildDoc(d: Doc): string {
  return `<!doctype html><html><head><meta charset="utf-8"><style>${d.css}</style></head><body>${d.html}${SHIM}<script>${d.js}<\/script></body></html>`;
}

function parseDoc(code: string): Doc {
  try { const p = JSON.parse(code); return { html: p.html ?? "", css: p.css ?? "", js: p.js ?? "" }; }
  catch { return { html: code, css: "", js: "" }; }
}

export default function WebIde({ persist = false, meId = "", initialSnippets = [] }: {
  persist?: boolean; meId?: string; initialSnippets?: Snippet[];
}) {
  const push = useToast();
  const [snippets, setSnippets] = useState<Snippet[]>(initialSnippets);
  const [activeId, setActiveId] = useState<string | null>(initialSnippets[0]?.id ?? null);
  const [title, setTitle] = useState(initialSnippets[0]?.title ?? "Untitled");
  const [doc, setDoc] = useState<Doc>(initialSnippets[0] ? parseDoc(initialSnippets[0].code) : STARTER);
  const [tab, setTab] = useState<"html" | "css" | "js">("html");
  const [srcDoc, setSrcDoc] = useState<string>("");
  const [logs, setLogs] = useState<{ level: string; text: string }[]>([]);
  const [saving, setSaving] = useState(false);

  // Capture console/errors from the preview iframe.
  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      if (e.data && e.data.__web) setLogs((p) => [...p, { level: e.data.level, text: e.data.text }]);
    };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, []);

  function run() { setLogs([]); setSrcDoc(buildDoc(doc)); }
  useEffect(() => { run(); /* first paint */ /* eslint-disable-next-line */ }, []);

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Tab") {
      e.preventDefault();
      const ta = e.currentTarget; const s = ta.selectionStart, en = ta.selectionEnd;
      const v = doc[tab];
      const next = v.slice(0, s) + "  " + v.slice(en);
      setDoc({ ...doc, [tab]: next });
      requestAnimationFrame(() => { ta.selectionStart = ta.selectionEnd = s + 2; });
    }
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); run(); }
  }

  async function save() {
    if (!persist || !meId) return;
    setSaving(true);
    const code = JSON.stringify(doc);
    if (activeId) {
      const { error } = await supabaseBrowser().from("code_snippets")
        .update({ title: title.trim() || "Untitled", code, language: "web", updated_at: new Date().toISOString() }).eq("id", activeId);
      setSaving(false);
      if (error) { push(/code_snippets/i.test(error.message) ? "Run migration-code-snippets.sql in Supabase first." : "Could not save.", "error"); return; }
      setSnippets((p) => p.map((s) => (s.id === activeId ? { ...s, title: title.trim() || "Untitled", code } : s)));
      push("Saved.", "success");
    } else {
      const { data, error } = await supabaseBrowser().from("code_snippets")
        .insert({ user_id: meId, title: title.trim() || "Untitled", code, language: "web" }).select().single();
      setSaving(false);
      if (error || !data) { push(/code_snippets/i.test(error?.message ?? "") ? "Run migration-code-snippets.sql in Supabase first." : "Could not save.", "error"); return; }
      setSnippets((p) => [{ id: data.id, title: data.title, code }, ...p]);
      setActiveId(data.id);
      push("Saved.", "success");
    }
  }

  function openSnippet(s: Snippet) { setActiveId(s.id); setTitle(s.title); setDoc(parseDoc(s.code)); setTimeout(run, 0); }
  function newSnippet() { setActiveId(null); setTitle("Untitled"); setDoc(STARTER); setLogs([]); setTimeout(run, 0); }
  async function delSnippet(id: string) {
    if (!window.confirm("Delete this snippet?")) return;
    await supabaseBrowser().from("code_snippets").delete().eq("id", id);
    setSnippets((p) => p.filter((s) => s.id !== id));
    if (activeId === id) newSnippet();
  }

  const TABS: { k: "html" | "css" | "js"; label: string }[] = [
    { k: "html", label: "HTML" }, { k: "css", label: "CSS" }, { k: "js", label: "JS" },
  ];

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
      <div className="min-w-0 grid gap-4 md:grid-cols-2">
        {/* Editors */}
        <div className="space-y-3">
          <div className="overflow-hidden rounded-xl border border-line shadow-card">
            <div className="flex items-center gap-1 border-b border-line bg-board px-2 py-1.5">
              {TABS.map((t) => (
                <button key={t.k} onClick={() => setTab(t.k)}
                  className={`rounded-md px-3 py-1 text-xs font-bold transition ${tab === t.k ? "bg-gold text-board" : "text-white/55 hover:text-white"}`}>
                  {t.label}
                </button>
              ))}
              {persist && (
                <input value={title} onChange={(e) => setTitle(e.target.value)}
                  className="ml-auto w-32 min-w-0 rounded-md bg-white/10 px-2 py-1 text-xs font-semibold text-white placeholder-white/40 outline-none" placeholder="Title" />
              )}
            </div>
            <CodeArea
              value={doc[tab]} onChange={(v) => setDoc({ ...doc, [tab]: v })} onKeyDown={onKeyDown}
              highlight={tab === "html" ? hlHtml : tab === "css" ? hlCss : hlJs}
              minHeight={300} ariaLabel={`${tab} editor`}
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={run} className="btn-gold !min-h-[42px] !px-6">▶ Run</button>
            {persist && <button onClick={save} disabled={saving} className="btn-ghost !min-h-[42px]">{saving ? "Saving…" : "Save"}</button>}
            <span className="ml-auto hidden text-xs text-ink/40 sm:block">Ctrl/⌘ + Enter to run</span>
          </div>
        </div>

        {/* Preview + console */}
        <div className="space-y-3">
          <div className="overflow-hidden rounded-xl border border-line shadow-card">
            <div className="border-b border-line bg-chalk px-3 py-1.5 text-xs font-bold text-ink/50">Preview</div>
            <iframe title="Web preview" sandbox="allow-scripts allow-modals allow-popups allow-forms"
              srcDoc={srcDoc} className="h-[300px] w-full bg-white" />
          </div>
          <div className="h-[92px] overflow-auto rounded-xl border border-line bg-[#0b2036] p-3 font-mono text-[12px] leading-relaxed">
            {logs.length === 0 ? <p className="text-white/35">console output…</p>
              : logs.map((l, i) => (
                <div key={i} className={`whitespace-pre-wrap ${l.level === "error" ? "text-red-300" : l.level === "warn" ? "text-amber-300" : "text-slate-100"}`}>{l.text}</div>
              ))}
          </div>
        </div>
      </div>

      {/* Snippets */}
      {persist && (
        <aside className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-sm font-bold">My web pages</h2>
            <button onClick={newSnippet} className="text-xs font-bold text-gold-deep hover:underline">+ New</button>
          </div>
          <div className="space-y-1.5">
            {snippets.length === 0 && <p className="text-sm text-ink/40">Save your first page to keep it here.</p>}
            {snippets.map((s) => (
              <div key={s.id} className={`group flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition ${activeId === s.id ? "bg-gold text-board" : "bg-chalk hover:bg-chalk/70"}`}>
                <button onClick={() => openSnippet(s)} className="min-w-0 flex-1 truncate text-left font-semibold">{s.title}</button>
                <button onClick={() => delSnippet(s.id)} aria-label="Delete"
                  className={`shrink-0 text-xs opacity-0 transition group-hover:opacity-100 ${activeId === s.id ? "text-board/70" : "text-red-500"}`}>✕</button>
              </div>
            ))}
          </div>
        </aside>
      )}
    </div>
  );
}
