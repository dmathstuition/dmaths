"use client";
import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";

// Self-service "Delete my account" (Google Play requires this for apps with
// account creation). Collapsed by default; expanding shows a clear warning and
// a type-DELETE confirmation before the irreversible call.
export default function DeleteAccountCard() {
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function deleteAccount() {
    if (confirm.trim().toUpperCase() !== "DELETE") {
      setError('Type DELETE (in capitals) to confirm.');
      return;
    }
    setBusy(true);
    setError("");
    const res = await fetch("/api/account/delete", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confirm: confirm.trim() }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error || "Could not delete the account — please try again or email dmathstuition@gmail.com.");
      setBusy(false);
      return;
    }
    try { await supabaseBrowser().auth.signOut(); } catch {}
    try { localStorage.clear(); } catch {}
    window.location.replace("/login?deleted=1");
  }

  return (
    <div className="card border-red-200 p-6">
      <h2 className="font-display text-lg font-semibold text-red-700">Delete my account</h2>
      <p className="mt-1 text-sm text-ink/55">
        Permanently removes your account and all your records — grades, attendance, messages,
        rewards and payment history. <strong>This cannot be undone.</strong>
      </p>

      {!open ? (
        <button onClick={() => setOpen(true)} className="btn-ghost mt-4 !min-h-[42px] !text-red-600">
          I want to delete my account
        </button>
      ) : (
        <div className="mt-4 space-y-3 rounded-xl border border-red-200 bg-red-50 p-4">
          <label className="block text-sm font-bold text-red-800" htmlFor="del-confirm">
            Type <span className="font-mono">DELETE</span> to confirm:
          </label>
          <input id="del-confirm" className="field font-mono" placeholder="DELETE"
            value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          {error && <p role="alert" className="text-sm font-semibold text-red-700">{error}</p>}
          <div className="flex flex-wrap gap-2">
            <button onClick={() => { setOpen(false); setConfirm(""); setError(""); }} className="btn-ghost !min-h-[42px]">
              Cancel
            </button>
            <button onClick={deleteAccount} disabled={busy} className="btn-danger !min-h-[42px]">
              {busy ? "Deleting…" : "Permanently delete my account"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
