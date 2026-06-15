"use client";
import { createContext, useContext, useState, useCallback } from "react";

type Toast = { id: number; msg: string; kind: "success" | "error" | "info" };
const ToastCtx = createContext<(msg: string, kind?: Toast["kind"]) => void>(() => {});

export function useToast() { return useContext(ToastCtx); }

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = useCallback((msg: string, kind: Toast["kind"] = "info") => {
    const id = Date.now() + Math.random();
    setToasts(t => [...t, { id, msg, kind }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500);
  }, []);

  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[200] flex flex-col gap-2">
        {toasts.map(t => (
          <div key={t.id}
            className={`pointer-events-auto flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-2xl
              ${t.kind === "success" ? "bg-emerald-600" : t.kind === "error" ? "bg-red-600" : "bg-board"}`}
            style={{ animation: "revealUp .25s ease-out" }}>
            {t.kind === "success" ? "✓" : t.kind === "error" ? "✕" : "•"} {t.msg}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
