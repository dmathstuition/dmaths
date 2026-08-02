import React from "react";

// Render an assistant reply with light formatting: ```fenced``` code as a block,
// `inline code` as a chip, and **bold** as bold. Any stray ** / __ markers that
// slip through are stripped so they never show as literal asterisks. Newlines
// are preserved by the bubble's whitespace-pre-wrap. Shared by the floating
// assistant widget and the full A.I page.
function inline(t: string, keyBase: number): React.ReactNode {
  return t.split(/(`[^`]+`|\*\*[^*]+\*\*)/g).map((p, i) => {
    if (p.length > 1 && p.startsWith("`") && p.endsWith("`")) {
      return <code key={`${keyBase}-${i}`} className="rounded bg-ink/10 px-1 py-0.5 font-mono text-[12px] dark:bg-white/10">{p.slice(1, -1)}</code>;
    }
    if (p.length > 3 && p.startsWith("**") && p.endsWith("**")) {
      return <strong key={`${keyBase}-${i}`} className="font-bold">{p.slice(2, -2)}</strong>;
    }
    return <span key={`${keyBase}-${i}`}>{p.replace(/\*\*|__/g, "")}</span>;
  });
}

export function formatMessage(text: string): React.ReactNode {
  const out: React.ReactNode[] = [];
  const re = /```(?:[a-zA-Z]+)?\n?([\s\S]*?)```/g;
  let last = 0, m: RegExpExecArray | null, k = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(<span key={k++}>{inline(text.slice(last, m.index), k)}</span>);
    out.push(
      <pre key={k++} className="my-1.5 overflow-auto rounded-lg bg-[#0b2036] p-2.5 font-mono text-[12px] leading-relaxed text-slate-100">
        {m[1].replace(/\n$/, "")}
      </pre>,
    );
    last = re.lastIndex;
  }
  if (last < text.length) out.push(<span key={k++}>{inline(text.slice(last), k)}</span>);
  return out;
}
