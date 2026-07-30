"use client";
import { useEffect, useState } from "react";
import { fmtNaira } from "@/lib/payments";

// "Pay ₦X now" on the student / parent Payments page. Opens Paystack for exactly
// the amount owed, tags the charge with the learner's id (so the ledger links it
// to them), verifies server-side, then reloads so the owing summary updates.
// Renders nothing if Paystack isn't configured — the transfer/cash flow stays.
declare global { interface Window { PaystackPop?: any } }

export default function PayBalanceButton({ email, amount, studentId }: {
  email: string;
  amount: number;
  studentId: string;
}) {
  const publicKey = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY;
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!publicKey) return;
    if (window.PaystackPop) { setReady(true); return; }
    const s = document.createElement("script");
    s.src = "https://js.paystack.co/v1/inline.js";
    s.onload = () => setReady(true);
    document.body.appendChild(s);
  }, [publicKey]);

  if (!publicKey || amount < 100) return null;

  function pay() {
    if (!email) { setError("No email on file — pay by transfer, or ask the school to add one."); return; }
    setError("");
    setBusy(true);
    const handler = window.PaystackPop.setup({
      key: publicKey,
      email,
      amount: Math.round(amount * 100), // kobo
      currency: "NGN",
      metadata: { studentId, purpose: "fees" },
      callback: (response: any) => {
        fetch("/api/paystack/verify", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reference: response.reference }),
        })
          .then((r) => r.json())
          .then((j) => {
            setBusy(false);
            if (j.verified) location.reload();
            else setError("Payment couldn't be verified. If you were charged, contact us — it will still be recorded.");
          })
          .catch(() => { setBusy(false); setError("Verification error. Please try again or pay by transfer."); });
      },
      onClose: () => setBusy(false),
    });
    handler.openIframe();
  }

  return (
    <div className="mt-4">
      <button onClick={pay} disabled={!ready || busy} className="btn-gold w-full !rounded-xl disabled:opacity-60">
        {busy ? "Processing…" : `Pay ${fmtNaira(amount)} now`}
      </button>
      <p className="mt-1.5 text-center text-[11px] text-ink/40">Card or bank transfer · secured by Paystack</p>
      {error && <p role="alert" className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-[12px] font-semibold text-red-700">{error}</p>}
    </div>
  );
}
