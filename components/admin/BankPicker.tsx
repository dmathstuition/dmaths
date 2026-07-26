"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@/components/Icons";
import { useDialog } from "@/lib/useDialog";
import { pickRandom, type BankRow } from "@/lib/questionBank";

// "Add from bank" for the CBT builder: filter the saved questions, tick the
// ones you want, or let it randomise N from whatever the filter shows — the
// same test structure, built in seconds instead of pasted in as JSON.
export default function BankPicker({
  subject, open, onClose, onAdd,
}: {
  subject?: string;
  open: boolean;
  onClose: () => void;
  onAdd: (rows: BankRow[]) => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [rows, setRows] = useState<BankRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [note, setNote] = useState("");
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [howMany, setHowMany] = useState(10);

  useDialog(open, onClose, panelRef, { autoFocus: false });

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setPicked(new Set());
    const qs = subject ? `?subject=${encodeURIComponent(subject)}` : "";
    fetch(`/api/question-bank${qs}`)
      .then((r) => r.json())
      .then((j) => { setRows(j.questions ?? []); setNote(j.error ?? ""); })
      .catch(() => setNote("Could not load the bank."))
      .finally(() => setLoading(false));
  }, [open, subject]);

  const visible = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((r) =>
      r.question.toLowerCase().includes(needle) || (r.topic ?? "").toLowerCase().includes(needle));
  }, [rows, search]);

  function toggle(id: string) {
    setPicked((p) => {
      const next = new Set(p);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function addPicked() {
    onAdd(rows.filter((r) => picked.has(r.id)));
    onClose();
  }

  function addRandom() {
    onAdd(pickRandom(visible, howMany));
    onClose();
  }

  if (!open) return null;

  return (
    <div role="dialog" aria-modal="true" aria-label="Add questions from the bank"
      className="fixed inset-0 z-[80] flex items-end justify-center p-0 sm:items-center sm:p-4">
      <button aria-label="Close the question bank" tabIndex={-1} onClick={onClose}
        className="absolute inset-0 bg-board/60 backdrop-blur-sm" />

      <div ref={panelRef}
        className="relative z-10 flex max-h-[88vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl dark:bg-board">
        <div className="flex items-start justify-between gap-3 border-b border-line px-6 py-4 dark:border-white/10">
          <div>
            <h2 className="font-display text-lg font-bold">Add from the bank</h2>
            <p className="text-[13px] text-ink/55">
              {subject ? `Saved ${subject} questions` : "Every saved question"} — tick some, or randomise.
            </p>
          </div>
          <button onClick={onClose} aria-label="Close the question bank"
            className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-chalk text-ink/60">
            <Icon name="close" />
          </button>
        </div>

        <div className="border-b border-line px-6 py-3 dark:border-white/10">
          <label htmlFor="bank-search" className="sr-only">Search the bank</label>
          <input id="bank-search" className="field" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search question text or topic…" />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-3">
          {loading && <p className="py-8 text-center text-sm text-ink/45">Loading…</p>}
          {!loading && note && (
            <p role="alert" className="rounded-xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">{note}</p>
          )}
          {!loading && !note && visible.length === 0 && (
            <p className="py-8 text-center text-sm text-ink/45">
              Nothing saved yet{subject ? ` for ${subject}` : ""}. Build a test, then use “Save these to the bank”.
            </p>
          )}

          <ul className="space-y-2">
            {visible.map((r) => {
              const on = picked.has(r.id);
              return (
                <li key={r.id}>
                  <button onClick={() => toggle(r.id)} aria-pressed={on}
                    className={`flex w-full items-start gap-3 rounded-2xl border p-3 text-left transition ${
                      on ? "border-gold bg-gold-pale" : "border-line hover:bg-chalk"}`}>
                    <span className={`mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md border ${
                      on ? "border-gold-deep bg-gold-deep text-white" : "border-line"}`}>
                      {on && <Icon name="checkCircle" className="h-3.5 w-3.5" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-ink">{r.question}</span>
                      <span className="mt-0.5 block text-[11px] text-ink/45">
                        {[r.subject, r.level, r.topic].filter(Boolean).join(" · ")} · {(r.options ?? []).length} options
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t border-line px-6 py-4 dark:border-white/10">
          <button onClick={addPicked} disabled={picked.size === 0} className="btn-gold">
            Add {picked.size > 0 ? `${picked.size} question${picked.size === 1 ? "" : "s"}` : "selected"}
          </button>
          <span className="text-sm text-ink/45">or</span>
          <label htmlFor="bank-random" className="sr-only">How many to randomise</label>
          <input id="bank-random" type="number" min={1} max={100} value={howMany}
            onChange={(e) => setHowMany(Math.max(1, Number(e.target.value) || 1))}
            className="field !w-20" />
          <button onClick={addRandom} disabled={visible.length === 0} className="btn-ghost">
            Randomise from {visible.length}
          </button>
        </div>
      </div>
    </div>
  );
}
