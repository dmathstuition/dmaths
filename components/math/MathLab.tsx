"use client";
import { useMemo, useState } from "react";
import { parse, format, parser as makeParser } from "mathjs";
import katex from "katex";
import "katex/dist/katex.min.css";
import { supabaseBrowser } from "@/lib/supabase/client";
import { useToast } from "@/components/Toast";

type Sheet = { id: string; title: string; code: string };

const STARTER = `# Type any formula — each line is worked out live.
# You can use units and convert between them.
2 + 3 * 4
sqrt(144) + 5^2
sin(pi / 4)
9.81 m/s^2 * 70 kg
5 km + 300 m to m
2 inch to cm
r = 3
area = pi * r^2`;

const EXAMPLES = [
  "sqrt(2)", "sin(pi/3)", "log(1000, 10)", "5!", "2^10",
  "3 km + 250 m to m", "60 mi/h to m/s", "9.81 m/s^2 * 70 kg",
  "1/2 * 4 kg * (3 m/s)^2", "100 N / 4 m^2 to Pa",
];

const tex = (s: string) => {
  try { return katex.renderToString(s, { throwOnError: false, displayMode: false, output: "html" }); }
  catch { return ""; }
};

type Row =
  | { kind: "blank" }
  | { kind: "comment"; text: string }
  | { kind: "calc"; inTex: string; outTex: string; outStr: string }
  | { kind: "error"; src: string; msg: string };

function evalSheet(text: string): Row[] {
  const p = makeParser();
  return text.split("\n").map((raw): Row => {
    const src = raw.trim();
    if (!src) return { kind: "blank" };
    if (src.startsWith("#")) return { kind: "comment", text: src.replace(/^#\s?/, "") };
    try {
      const inTex = parse(src).toTex({ parenthesis: "keep", implicit: "hide" });
      const val = p.evaluate(src);
      let outStr = "", outTex = "";
      if (val !== undefined && typeof val !== "function") {
        outStr = format(val, { precision: 6 });
        try { outTex = parse(outStr).toTex(); } catch { outTex = ""; }
      }
      return { kind: "calc", inTex, outTex, outStr };
    } catch (e: any) {
      return { kind: "error", src, msg: e?.message ?? "Invalid expression" };
    }
  });
}

export default function MathLab({ persist = false, meId = "", initialSheets = [] }: {
  persist?: boolean; meId?: string; initialSheets?: Sheet[];
}) {
  const push = useToast();
  const [sheets, setSheets] = useState<Sheet[]>(initialSheets);
  const [activeId, setActiveId] = useState<string | null>(initialSheets[0]?.id ?? null);
  const [title, setTitle] = useState(initialSheets[0]?.title ?? "Untitled");
  const [text, setText] = useState(initialSheets[0]?.code ?? STARTER);
  const [saving, setSaving] = useState(false);

  const rows = useMemo(() => evalSheet(text), [text]);

  function append(ex: string) { setText((t) => (t.endsWith("\n") || t === "" ? t : t + "\n") + ex); }

  async function save() {
    if (!persist || !meId) return;
    setSaving(true);
    if (activeId) {
      const { error } = await supabaseBrowser().from("code_snippets")
        .update({ title: title.trim() || "Untitled", code: text, updated_at: new Date().toISOString() }).eq("id", activeId);
      setSaving(false);
      if (error) { push(/code_snippets/i.test(error.message) ? "Run migration-code-snippets.sql in Supabase first." : "Could not save.", "error"); return; }
      setSheets((p) => p.map((s) => (s.id === activeId ? { ...s, title: title.trim() || "Untitled", code: text } : s)));
      push("Saved.", "success");
    } else {
      const { data, error } = await supabaseBrowser().from("code_snippets")
        .insert({ user_id: meId, title: title.trim() || "Untitled", code: text, language: "math" }).select().single();
      setSaving(false);
      if (error || !data) { push(/code_snippets/i.test(error?.message ?? "") ? "Run migration-code-snippets.sql in Supabase first." : "Could not save.", "error"); return; }
      setSheets((p) => [{ id: data.id, title: data.title, code: data.code }, ...p]);
      setActiveId(data.id);
      push("Saved.", "success");
    }
  }
  function openSheet(s: Sheet) { setActiveId(s.id); setTitle(s.title); setText(s.code); }
  function newSheet() { setActiveId(null); setTitle("Untitled"); setText(STARTER); }
  async function delSheet(id: string) {
    if (!window.confirm("Delete this sheet?")) return;
    await supabaseBrowser().from("code_snippets").delete().eq("id", id);
    setSheets((p) => p.filter((s) => s.id !== id));
    if (activeId === id) newSheet();
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
      <div className="min-w-0 grid gap-4 md:grid-cols-2">
        {/* Input */}
        <div className="space-y-3">
          <div className="overflow-hidden rounded-xl border border-line shadow-card">
            <div className="flex items-center gap-2 border-b border-line bg-board px-3 py-2">
              <span className="text-xs font-bold text-white/70">Formulas</span>
              {persist && (
                <input value={title} onChange={(e) => setTitle(e.target.value)}
                  className="ml-auto w-32 min-w-0 rounded-md bg-white/10 px-2 py-1 text-xs font-semibold text-white placeholder-white/40 outline-none" placeholder="Sheet title" />
              )}
            </div>
            <textarea value={text} onChange={(e) => setText(e.target.value)} spellCheck={false}
              className="code-editor-ta !min-h-[340px]" aria-label="Formula input"
              style={{ color: "#e2e8f0", caretColor: "#EFAE56", background: "#0b2036" }} />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {EXAMPLES.map((ex) => (
              <button key={ex} onClick={() => append(ex)}
                className="rounded-lg border border-line bg-white px-2.5 py-1 font-mono text-[11px] text-ink/60 transition hover:border-gold hover:text-gold-deep">
                {ex}
              </button>
            ))}
          </div>
          {persist && (
            <div className="flex gap-2">
              <button onClick={save} disabled={saving} className="btn-ghost !min-h-[40px]">{saving ? "Saving…" : "Save sheet"}</button>
            </div>
          )}
        </div>

        {/* Live results */}
        <div className="rounded-xl border border-line bg-white p-4 shadow-card">
          <p className="mb-3 text-xs font-bold uppercase tracking-wide text-ink/40">Live result</p>
          <div className="space-y-2.5">
            {rows.map((r, i) => {
              if (r.kind === "blank") return <div key={i} className="h-2" />;
              if (r.kind === "comment") return <p key={i} className="text-[13px] italic text-ink/40">{r.text}</p>;
              if (r.kind === "error") return (
                <div key={i} className="rounded-lg bg-red-50 px-3 py-1.5 text-[12px] text-red-700">
                  <span className="font-mono">{r.src}</span> — {r.msg}
                </div>
              );
              return (
                <div key={i} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-line/60 pb-2.5">
                  <span className="text-ink" dangerouslySetInnerHTML={{ __html: tex(r.inTex) }} />
                  {r.outStr && (
                    <span className="flex items-baseline gap-2">
                      <span className="text-ink/30">=</span>
                      <span className="font-semibold text-gold-deep"
                        dangerouslySetInnerHTML={{ __html: r.outTex ? tex(r.outTex) : "" }} />
                      {!r.outTex && <span className="font-mono text-sm font-semibold text-gold-deep">{r.outStr}</span>}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Saved sheets */}
      {persist && (
        <aside className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-sm font-bold">My sheets</h2>
            <button onClick={newSheet} className="text-xs font-bold text-gold-deep hover:underline">+ New</button>
          </div>
          <div className="space-y-1.5">
            {sheets.length === 0 && <p className="text-sm text-ink/40">Save your first sheet to keep it here.</p>}
            {sheets.map((s) => (
              <div key={s.id} className={`group flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition ${activeId === s.id ? "bg-gold text-board" : "bg-chalk hover:bg-chalk/70"}`}>
                <button onClick={() => openSheet(s)} className="min-w-0 flex-1 truncate text-left font-semibold">{s.title}</button>
                <button onClick={() => delSheet(s.id)} aria-label="Delete"
                  className={`shrink-0 text-xs opacity-0 transition group-hover:opacity-100 ${activeId === s.id ? "text-board/70" : "text-red-500"}`}>✕</button>
              </div>
            ))}
          </div>
        </aside>
      )}
    </div>
  );
}
