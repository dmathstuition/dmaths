"use client";
import { useAssistantTask } from "@/components/portal/AssistantContext";

// Opens the existing D-Maths Buddy assistant widget. Purely a second entry
// point to the same panel — no new logic, it just flips the shared open state.
export default function AskBuddyButton({
  label = "Ask me anything",
  className = "",
}: {
  label?: string;
  className?: string;
}) {
  const { setOpen } = useAssistantTask();
  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      className={
        className ||
        "group inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-bold text-ink shadow-sm transition hover:shadow-lift"
      }
    >
      {label}
      <span className="transition-transform duration-200 group-hover:translate-x-0.5">→</span>
    </button>
  );
}
