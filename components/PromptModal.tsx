"use client";
import { useId, useRef, useState } from "react";
import { useDialog } from "@/lib/useDialog";

export default function PromptModal({
  title, message = "", placeholder = "", onConfirm, onCancel,
}: {
  title: string; message?: string; placeholder?: string;
  onConfirm: (value: string) => void; onCancel: () => void;
}) {
  const [value, setValue] = useState("");
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  // Focuses the textarea (first control), traps Tab, Esc cancels.
  useDialog(true, onCancel, panelRef);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <div ref={panelRef} className="card w-full max-w-sm p-6">
        <h2 id={titleId} className="font-display text-lg font-semibold">{title}</h2>
        {message && <p className="mt-2 text-sm text-ink/60">{message}</p>}
        <textarea className="field mt-3 min-h-[80px]" placeholder={placeholder} aria-label={title}
          value={value} onChange={e => setValue(e.target.value)} />
        <div className="mt-4 flex gap-3">
          <button className="btn-ghost flex-1" onClick={onCancel}>Cancel</button>
          <button className="btn-gold flex-1" onClick={() => onConfirm(value)}>Confirm</button>
        </div>
      </div>
    </div>
  );
}
