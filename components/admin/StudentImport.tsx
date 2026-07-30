"use client";
import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";
import { parseStudentsCsv, CSV_TEMPLATE } from "@/lib/csvStudents";

// Bulk student import: paste (or load) a CSV, preview what will be created and
// what won't, then create the accounts in one go. Parsing/validation is the same
// lib the API re-runs server-side, so the preview matches the result.
export default function StudentImport({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const push = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [csv, setCsv] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<null | { created: number; skipped: { email: string; reason: string }[] }>(null);

  // Live preview as they paste.
  const preview = useMemo(() => (csv.trim() ? parseStudentsCsv(csv) : null), [csv]);

  function loadFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => setCsv(String(reader.result ?? ""));
    reader.readAsText(file);
  }

  function downloadTemplate() {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([CSV_TEMPLATE], { type: "text/csv" }));
    a.download = "dmaths-students-template.csv";
    a.click();
  }

  async function run() {
    setBusy(true);
    setResult(null);
    const res = await fetch("/api/students/import", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ csv }),
    });
    setBusy(false);
    const j = await res.json().catch(() => ({}));
    if (!res.ok) { push(j.error || "Import failed.", "error"); return; }
    setResult({ created: j.created, skipped: j.skipped ?? [] });
    push(`${j.created} learner${j.created === 1 ? "" : "s"} created.`, "success");
    router.refresh();
  }

  return (
    <div className="card space-y-4 p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-semibold">Import students from a spreadsheet</h2>
          <p className="text-sm text-ink/55">
            One learner per row. Columns: <strong>First name, Last name, Email</strong> (required),
            then optionally Level, Guardian email, Guardian name, Phone. Each gets a Student ID and a
            login email automatically.
          </p>
        </div>
        <button onClick={onClose} className="btn-ghost !min-h-[40px]">Close</button>
      </div>

      <div className="flex flex-wrap gap-2">
        <button onClick={() => fileRef.current?.click()} className="btn-ghost !min-h-[40px] text-sm">Load a .csv file</button>
        <button onClick={downloadTemplate} className="btn-ghost !min-h-[40px] text-sm">Download template</button>
        <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) loadFile(f); }} />
      </div>

      <div>
        <label htmlFor="import-csv" className="flabel">Paste CSV, or load a file above</label>
        <textarea id="import-csv" className="field min-h-[160px] font-mono text-xs" value={csv}
          onChange={(e) => setCsv(e.target.value)}
          placeholder={CSV_TEMPLATE} />
      </div>

      {preview && (
        <div className="rounded-xl bg-chalk px-4 py-3 text-sm">
          <p className="font-semibold text-ink/70">
            {preview.rows.length} learner{preview.rows.length === 1 ? "" : "s"} ready to import
            {preview.errors.length > 0 && <span className="text-red-600"> · {preview.errors.length} row{preview.errors.length === 1 ? "" : "s"} skipped</span>}
          </p>
          {preview.errors.length > 0 && (
            <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto text-[12px] text-red-700">
              {preview.errors.map((e, i) => <li key={i}>Line {e.line}: {e.reason}</li>)}
            </ul>
          )}
        </div>
      )}

      {result && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm">
          <p className="font-bold text-emerald-800">✓ {result.created} learner{result.created === 1 ? "" : "s"} created and emailed their login.</p>
          {result.skipped.length > 0 && (
            <>
              <p className="mt-2 font-semibold text-ink/70">{result.skipped.length} skipped:</p>
              <ul className="mt-1 max-h-40 space-y-1 overflow-y-auto text-[12px] text-ink/60">
                {result.skipped.map((s, i) => <li key={i}>{s.email} — {s.reason}</li>)}
              </ul>
            </>
          )}
        </div>
      )}

      <button onClick={run} disabled={busy || !preview?.rows.length} className="btn-gold disabled:opacity-50">
        {busy ? "Creating…" : preview?.rows.length ? `Create ${preview.rows.length} student${preview.rows.length === 1 ? "" : "s"}` : "Create students"}
      </button>
    </div>
  );
}
