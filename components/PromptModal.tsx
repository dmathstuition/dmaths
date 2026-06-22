"use client";
import { useEffect, useRef, useState } from "react";

export default function PromptModal({
  title, message = "", placeholder = "", onConfirm, onCancel,
}: {
  title: string; message?: string; placeholder?: string;
  onConfirm: (value: string) => void; onCancel: () => void;
}) {
  const [value, setValue] = useState("");
  const areaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    areaRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onCancel(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onCancel]);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      role="dialog" aria-modal="true">
      <div className="card w-full max-w-sm p-6">
        <h2 className="font-display text-lg font-semibold">{title}</h2>
        {message && <p className="mt-2 text-sm text-ink/60">{message}</p>}
        <textarea ref={areaRef} className="field mt-3 min-h-[80px]" placeholder={placeholder}
          value={value} onChange={e => setValue(e.target.value)} />
        <div className="mt-4 flex gap-3">
          <button className="btn-ghost flex-1" onClick={onCancel}>Cancel</button>
          <button className="btn-gold flex-1" onClick={() => onConfirm(value)}>Confirm</button>
        </div>
      </div>
    </div>
  );
}
