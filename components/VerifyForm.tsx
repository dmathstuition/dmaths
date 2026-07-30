"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

// The serial box on the public /verify page — routes to /verify/<serial>.
export default function VerifyForm({ defaultValue = "" }: { defaultValue?: string }) {
  const router = useRouter();
  const [serial, setSerial] = useState(defaultValue);

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); const s = serial.trim(); if (s) router.push(`/verify/${encodeURIComponent(s)}`); }}
      className="flex w-full max-w-md flex-col gap-3 sm:flex-row"
    >
      <label htmlFor="verify-serial" className="sr-only">Certificate or report code</label>
      <input
        id="verify-serial"
        value={serial}
        onChange={(e) => setSerial(e.target.value)}
        placeholder="e.g. DM-2026-A1B2"
        autoCapitalize="characters"
        className="min-w-0 flex-1 rounded-xl border border-white/20 bg-white/10 px-4 py-3 font-mono text-sm text-white placeholder:text-white/40 outline-none focus:border-gold focus:ring-2 focus:ring-gold/30"
      />
      <button type="submit" className="btn-gold !rounded-xl !px-6" disabled={!serial.trim()}>
        Verify
      </button>
    </form>
  );
}
