"use client";
import { useEffect, useRef, useState } from "react";
import { EditorState, Compartment } from "@codemirror/state";
import { EditorView, keymap, placeholder as cmPlaceholder } from "@codemirror/view";
import { indentWithTab } from "@codemirror/commands";
import { basicSetup } from "codemirror";
import { oneDark } from "@codemirror/theme-one-dark";
import { python } from "@codemirror/lang-python";
import { html } from "@codemirror/lang-html";
import { css } from "@codemirror/lang-css";
import { javascript } from "@codemirror/lang-javascript";

export type EditorLanguage = "python" | "html" | "css" | "javascript";

const LANG = {
  python: () => python(),
  html: () => html(),
  css: () => css(),
  javascript: () => javascript(),
};
const LABEL: Record<EditorLanguage, string> = { python: "Python", html: "HTML", css: "CSS", javascript: "JavaScript" };

// A VS Code-style code editor built on CodeMirror 6: line numbers, syntax
// highlighting, autocomplete, bracket matching + auto-close, code folding,
// find/replace (Ctrl/⌘+F), multi-cursor and an active-line highlight — all
// bundled locally (offline-safe, CSP-safe). Drop-in replacement for the old
// textarea editor. `onRun` fires on Ctrl/⌘/Shift + Enter.
export default function Editor({
  value, onChange, language, onRun, minHeight = 320, ariaLabel, placeholder, statusBar = true,
}: {
  value: string;
  onChange: (v: string) => void;
  language: EditorLanguage;
  onRun?: () => void;
  minHeight?: number;
  ariaLabel?: string;
  placeholder?: string;
  statusBar?: boolean;
}) {
  const host = useRef<HTMLDivElement>(null);
  const view = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);
  const onRunRef = useRef(onRun);
  onChangeRef.current = onChange;
  onRunRef.current = onRun;

  const [cursor, setCursor] = useState({ line: 1, col: 1 });

  // Build the view once.
  useEffect(() => {
    if (!host.current) return;
    const langCompartment = new Compartment();

    const runKeys = keymap.of([
      indentWithTab,
      { key: "Mod-Enter", run: () => { onRunRef.current?.(); return true; }, preventDefault: true },
      { key: "Shift-Enter", run: () => { onRunRef.current?.(); return true; }, preventDefault: true },
    ]);

    const themeSize = EditorView.theme({
      "&": { fontSize: "13.5px", borderRadius: "0 0 0.75rem 0.75rem" },
      ".cm-scroller": { minHeight: `${minHeight}px`, fontFamily: "var(--font-fira), ui-monospace, monospace", lineHeight: "1.6" },
      ".cm-gutters": { borderRadius: "0 0 0 0.75rem" },
      "&.cm-focused": { outline: "none" },
    });

    const state = EditorState.create({
      doc: value,
      extensions: [
        runKeys,           // before basicSetup so Mod-Enter wins over default
        basicSetup,
        langCompartment.of(LANG[language]()),
        oneDark,
        themeSize,
        EditorView.lineWrapping,
        ...(placeholder ? [cmPlaceholder(placeholder)] : []),
        EditorView.updateListener.of((u) => {
          if (u.docChanged) onChangeRef.current(u.state.doc.toString());
          if (u.selectionSet || u.docChanged) {
            const pos = u.state.selection.main.head;
            const line = u.state.doc.lineAt(pos);
            setCursor({ line: line.number, col: pos - line.from + 1 });
          }
        }),
        EditorView.contentAttributes.of({ "aria-label": ariaLabel ?? "Code editor" }),
      ],
    });

    const v = new EditorView({ state, parent: host.current });
    view.current = v;
    // stash the compartment on the view so the language effect can reconfigure it
    (v as any)._langCompartment = langCompartment;
    return () => { v.destroy(); view.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reconcile external value changes (open snippet / New / tab switch).
  useEffect(() => {
    const v = view.current;
    if (!v) return;
    const current = v.state.doc.toString();
    if (value !== current) {
      v.dispatch({ changes: { from: 0, to: current.length, insert: value } });
    }
  }, [value]);

  // Reconfigure language if it changes without remounting.
  useEffect(() => {
    const v = view.current;
    const compartment = v && (v as any)._langCompartment;
    if (v && compartment) v.dispatch({ effects: compartment.reconfigure(LANG[language]()) });
  }, [language]);

  return (
    <div className="cm-wrap overflow-hidden rounded-b-xl">
      <div ref={host} className="cm-host resize-y overflow-auto" />
      {statusBar && (
        <div className="flex items-center justify-between border-t border-white/10 bg-[#0b2036] px-3 py-1 font-mono text-[11px] text-white/45">
          <span>Ln {cursor.line}, Col {cursor.col}</span>
          <span className="flex items-center gap-3">
            <span>{LABEL[language]}</span>
            {onRun && <span className="hidden sm:inline">⌘/Ctrl+Enter to run</span>}
          </span>
        </div>
      )}
    </div>
  );
}
