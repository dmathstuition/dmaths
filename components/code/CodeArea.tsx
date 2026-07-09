"use client";
import { useRef } from "react";
import type { Highlighter } from "@/components/code/highlighters";

// A syntax-highlighted code editor: a transparent <textarea> over a highlighted
// <pre>, kept in scroll-sync. Dependency-free and CSP-safe. The caller supplies
// the highlighter and the key handler (indent size, run shortcut).
export default function CodeArea({ value, onChange, onKeyDown, highlight, minHeight = 300, ariaLabel }: {
  value: string;
  onChange: (v: string) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  highlight: Highlighter;
  minHeight?: number;
  ariaLabel?: string;
}) {
  const preRef = useRef<HTMLPreElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const sync = () => {
    if (preRef.current && taRef.current) {
      preRef.current.scrollTop = taRef.current.scrollTop;
      preRef.current.scrollLeft = taRef.current.scrollLeft;
    }
  };
  return (
    <div className="code-editor-wrap">
      <pre ref={preRef} className="code-editor-pre" aria-hidden="true"><code dangerouslySetInnerHTML={{ __html: highlight(value) }} /></pre>
      <textarea
        ref={taRef} value={value} spellCheck={false}
        onChange={(e) => onChange(e.target.value)} onScroll={sync} onKeyDown={onKeyDown}
        className="code-editor-ta" style={{ minHeight }} aria-label={ariaLabel}
      />
    </div>
  );
}
