"use client";
import { useEffect, useState } from "react";

// Sits on the /offline fallback page: the moment the connection returns, reload
// so the learner lands back where they were trying to go — no need to tap
// "Try again". Also reflects live status in a small line of text.
export default function OfflineAutoRetry() {
  const [online, setOnline] = useState(false);

  useEffect(() => {
    const back = () => { setOnline(true); setTimeout(() => location.reload(), 600); };
    if (navigator.onLine) back();
    window.addEventListener("online", back);
    return () => window.removeEventListener("online", back);
  }, []);

  return (
    <p className="mt-4 text-[13px] font-semibold text-white/45" aria-live="polite">
      {online ? "Connection restored — reloading…" : "Waiting for your connection to come back…"}
    </p>
  );
}
