"use client";

// Marks provisional attendance, then opens the class link in a new tab.
export default function JoinClassButton({ classId, link, className, label = "Join class" }: {
  classId: string; link: string; className?: string; label?: string;
}) {
  async function join(e: React.MouseEvent) {
    e.preventDefault();
    // fire-and-forget the self-mark; don't block the student from joining
    try {
      await fetch("/api/attendance/join", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ classId }),
      });
    } catch { /* ignore — joining matters more than the mark */ }
    window.open(link, "_blank", "noopener,noreferrer");
  }

  return <a href={link} onClick={join} className={className}>{label}</a>;
}
