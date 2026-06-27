"use client";
import { useState, useEffect } from "react";

// Optional inline Paystack payment. Renders only if the public key is set.
// On success it calls our /api/paystack/verify route (server-side check),
// then hands the verified reference + amount back to the form.
declare global { interface Window { PaystackPop?: any } }

export default function PaystackButton({
  email, amount, plan, camp, onVerified,
}: {
  email: string;
  amount: number;
  plan?: string;
  camp?: string;
  onVerified: (ref: string, amount: number) => void;
}) {
  const publicKey = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY;
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!publicKey) return;
    if (window.PaystackPop) { setReady(true); return; }
    const s = document.createElement("script");
    s.src = "https://js.paystack.co/v1/inline.js";
    s.onload = () => setReady(true);
    document.body.appendChild(s);
  }, [publicKey]);

  if (!publicKey) return null; // payments not configured → button hidden, manual flow stays

  function pay() {
    if (!email) return alert("Enter your email first.");
    if (!amount || amount < 100) return alert("Enter a valid amount.");
    setLoading(true);

    const handler = window.PaystackPop.setup({
      key: publicKey,
      email,
      amount: Math.round(amount * 100), // kobo
      currency: "NGN",
      metadata: { plan: plan || "", camp: camp || "" },
      callback: (response: any) => {
        // verify server-side before trusting it (server also re-checks amount)
        fetch("/api/paystack/verify", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reference: response.reference, plan: plan || "" }),
        })
          .then(r => r.json())
          .then(j => {
            setLoading(false);
            if (j.verified) onVerified(response.reference, j.amount);
            else alert("Payment could not be verified. Please try again or pay by transfer.");
          })
          .catch(() => { setLoading(false); alert("Verification error. Please try transfer instead."); });
      },
      onClose: () => setLoading(false),
    });
    handler.openIframe();
  }

  return (
    <button type="button" onClick={pay} disabled={!ready || loading}
      className="btn-ink w-full">
      {loading ? "Processing…" : "Pay with card / bank (instant) →"}
    </button>
  );
}
