"use client";
import { useState } from "react";
import PythonIde from "@/components/code/PythonIde";
import WebIde from "@/components/code/WebIde";

type Snippet = { id: string; title: string; code: string; language?: string | null };

// Tabbed code space: Python (Pyodide) and Web (HTML/CSS/JS live preview). Each
// tab mounts on first open and then stays mounted, so switching tabs never
// reloads the Python engine or the preview. Snippets are split by language.
export default function Playground({ persist = false, meId = "", snippets = [] }: {
  persist?: boolean; meId?: string; snippets?: Snippet[];
}) {
  const [tab, setTab] = useState<"python" | "web">("python");
  const [seen, setSeen] = useState<Record<string, boolean>>({ python: true });

  const go = (t: "python" | "web") => { setTab(t); setSeen((s) => ({ ...s, [t]: true })); };

  const py = snippets.filter((s) => (s.language ?? "python") === "python").map(({ id, title, code }) => ({ id, title, code }));
  const web = snippets.filter((s) => s.language === "web").map(({ id, title, code }) => ({ id, title, code }));

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Tab active={tab === "python"} onClick={() => go("python")}>Python</Tab>
        <Tab active={tab === "web"} onClick={() => go("web")}>Web · HTML/CSS/JS</Tab>
      </div>

      <div className={tab === "python" ? "" : "hidden"}>
        {seen.python && <PythonIde persist={persist} meId={meId} initialSnippets={py} />}
      </div>
      <div className={tab === "web" ? "" : "hidden"}>
        {seen.web && <WebIde persist={persist} meId={meId} initialSnippets={web} />}
      </div>
    </div>
  );
}

function Tab({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick}
      className={`rounded-full px-4 py-1.5 text-sm font-bold transition ${active ? "bg-gold text-board shadow" : "bg-chalk text-ink/55 hover:bg-chalk/70"}`}>
      {children}
    </button>
  );
}
