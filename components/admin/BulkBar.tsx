"use client";
import type { ReactNode } from "react";

// The floating action bar that appears once one or more rows are selected in an
// admin list. Areas drop their own action buttons (delete, re-tag…) as children.
export default function BulkBar({
  count, onClear, children, noun = "item",
}: {
  count: number; onClear: () => void; children?: ReactNode; noun?: string;
}) {
  if (count === 0) return null;
  return (
    <div className="sticky top-2 z-30 flex flex-wrap items-center gap-3 rounded-2xl border border-gold/50 bg-white/95 px-4 py-3 shadow-lg ring-1 ring-black/5 backdrop-blur">
      <span className="text-sm font-bold text-ink">
        {count} {noun}{count === 1 ? "" : "s"} selected
      </span>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
      <button onClick={onClear} className="ml-auto text-sm font-bold text-ink/50 hover:text-ink hover:underline">
        Clear
      </button>
    </div>
  );
}
