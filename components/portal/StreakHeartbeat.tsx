"use client";
import { useEffect } from "react";

// Fires once per calendar day (guarded by localStorage) to advance the
// learner's activity streak. Silent and best-effort.
export default function StreakHeartbeat() {
  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    try {
      if (localStorage.getItem("dmaths-streak-ping") === today) return;
      fetch("/api/streak/ping", { method: "POST" })
        .then(() => localStorage.setItem("dmaths-streak-ping", today))
        .catch(() => {});
    } catch {
      /* storage blocked — skip */
    }
  }, []);
  return null;
}
