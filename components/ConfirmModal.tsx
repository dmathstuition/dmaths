"use client";
import { useEffect, useId, useRef } from "react";
import { useDialog } from "@/lib/useDialog";

export default function ConfirmModal({
  title, message, confirmLabel = "Confirm", danger = false, onConfirm, onCancel,
}: {
  title: string; message: string; confirmLabel?: string; danger?: boolean;
  onConfirm: () => void; onCancel: () => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();

  // Esc, focus trap and focus-return; the confirm button takes focus itself.
  useDialog(true, onCancel, panelRef, { autoFocus: false });
  useEffect(() => { btnRef.current?.focus(); }, []);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <div ref={panelRef} className="card w-full max-w-sm p-6">
        <h2 id={titleId} className="font-display text-lg font-semibold">{title}</h2>
        <p className="mt-2 text-sm text-ink/60">{message}</p>
        <div className="mt-5 flex gap-3">
          <button className="btn-ghost flex-1" onClick={onCancel}>Cancel</button>
          <button ref={btnRef} className={`flex-1 ${danger ? "btn-danger" : "btn-gold"}`} onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
