"use client";
import { useState } from "react";
import { Icon } from "@/components/Icons";

type Result = { ok: boolean; stage?: string; message?: string; model?: string; reply?: string; status?: number | null };

// A one-click "is the AI assistant working?" check for admins. Pings the DeepSeek
// health endpoint and shows a plain-English result — no learner account needed.
export default function AssistantHealthCheck() {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  async function test() {
    setBusy(true);
    setResult(null);
    try {
      const res = await fetch("/api/assistant/health", { method: "POST" });
      setResult(await res.json());
    } catch {
      setResult({ ok: false, message: "Could not reach the server. Check your connection and try again." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gold-pale text-gold-deep"><Icon name="compass" className="h-5 w-5" /></span>
          <div>
            <h2 className="font-display text-base font-bold">AI assistant (DeepSeek)</h2>
            <p className="text-xs text-ink/45">Check the connection without needing a learner login.</p>
          </div>
        </div>
        <button onClick={test} disabled={busy} className="btn-gold !min-h-[40px] !px-5">
          {busy ? "Testing…" : "Test connection"}
        </button>
      </div>

      {result && (
        <div className={`mt-4 rounded-xl border-l-4 px-4 py-3 text-sm ${
          result.ok ? "border-l-emerald-500 bg-emerald-50 text-emerald-900" : "border-l-red-500 bg-red-50 text-red-900"
        }`}>
          {result.ok ? (
            <p className="font-bold">✅ DeepSeek is responding — the assistant is live. <span className="font-normal text-emerald-900/70">(model: {result.model})</span></p>
          ) : (
            <>
              <p className="font-bold">❌ Not working{result.stage ? ` — ${labelFor(result.stage)}` : ""}.</p>
              <p className="mt-1 text-red-900/80">{result.message}</p>
              {result.stage === "not_configured" && (
                <p className="mt-1 text-xs text-red-900/60">Tip: env vars only take effect after a redeploy / Promote to Production.</p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function labelFor(stage: string) {
  switch (stage) {
    case "not_configured": return "key not set";
    case "auth": return "invalid key";
    case "rate_limit": return "rate limited / no balance";
    case "billing": return "no DeepSeek credit";
    case "forbidden": return "not allowed";
    default: return "connection error";
  }
}
