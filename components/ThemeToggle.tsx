"use client";
import { useEffect, useState } from "react";
import { Icon } from "@/components/Icons";

export default function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("theme");
    const prefers = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const isDark = saved ? saved === "dark" : prefers;
    setDark(isDark);
    document.documentElement.classList.toggle("dark", isDark);
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  }

  return (
    <button onClick={toggle} aria-label="Toggle dark mode"
      className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white/40 transition hover:bg-white/10 hover:text-white">
      <Icon name={dark ? "sun" : "moon"} className="opacity-70" />
      {dark ? "Light mode" : "Dark mode"}
    </button>
  );
}
