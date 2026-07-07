"use client";
import { useEffect, useState } from "react";

// A small rotating tip line for the dashboard hero. Cycles gently on an
// interval (the global reduced-motion rule disables the fade transition).
const DEFAULT_TIPS = [
  "Consistency beats cramming — a little every day builds your streak. 🔥",
  "Stuck on a topic? Send your tutor a message right from the portal. 💬",
  "Submit assignments early to leave time for feedback. ✅",
  "Refer a friend and learn together — everyone grows faster. 🎁",
  "Review your graded work — that's where the biggest gains hide. 📈",
];

export default function DashboardTip({ tips = DEFAULT_TIPS }: { tips?: string[] }) {
  const [i, setI] = useState(0);

  useEffect(() => {
    setI(Math.floor(Math.random() * tips.length)); // vary the first tip per load
    const t = setInterval(() => setI((p) => (p + 1) % tips.length), 6500);
    return () => clearInterval(t);
  }, [tips.length]);

  return (
    <p key={i} className="page-enter mt-4 max-w-md text-[13px] font-medium leading-relaxed text-white/70">
      <span aria-hidden="true">💡</span> {tips[i]}
    </p>
  );
}
