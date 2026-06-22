"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import { Icon } from "@/components/Icons";

interface Result {
  id: string;
  first_name: string;
  last_name: string;
  student_code: string;
}

export default function AdminSearch() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [focused, setFocused] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setFocused(false);
      }
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, []);

  function handleChange(value: string) {
    setQ(value);
    if (timer.current) clearTimeout(timer.current);
    if (!value.trim()) { setResults([]); return; }
    timer.current = setTimeout(async () => {
      const trimmed = value.trim();
      const { data } = await supabaseBrowser()
        .from("profiles")
        .select("id, first_name, last_name, student_code")
        .eq("role", "student")
        .or(`first_name.ilike.*${trimmed}*,last_name.ilike.*${trimmed}*,student_code.ilike.*${trimmed}*`)
        .limit(6);
      setResults(data ?? []);
    }, 300);
  }

  function pick(r: Result) {
    setQ("");
    setResults([]);
    setFocused(false);
    router.push(`/admin/students/${r.id}`);
  }

  const open = focused && results.length > 0;

  return (
    <div ref={containerRef} className="relative hidden lg:flex">
      <div className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm transition ${
        focused ? "border-gold bg-white shadow-sm" : "border-line bg-chalk"
      }`}>
        <Icon name="search" className="h-4 w-4 text-ink/40 flex-shrink-0" />
        <input
          value={q}
          onChange={e => handleChange(e.target.value)}
          onFocus={() => setFocused(true)}
          placeholder="Search students…"
          className="w-44 bg-transparent text-sm outline-none placeholder:text-ink/35"
        />
      </div>
      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 w-72 overflow-hidden rounded-xl bg-white shadow-2xl ring-1 ring-black/5">
          {results.map(r => (
            <button key={r.id} onClick={() => pick(r)}
              className="flex w-full items-center justify-between px-4 py-2.5 text-left text-sm hover:bg-chalk">
              <span className="font-semibold text-ink">{r.first_name} {r.last_name}</span>
              <span className="font-mono text-xs text-ink/40">{r.student_code}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
