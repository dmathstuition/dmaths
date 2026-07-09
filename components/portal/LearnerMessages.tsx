"use client";
import { useState } from "react";
import MessagesClient from "@/components/portal/MessagesClient";
import DirectThread from "@/components/portal/DirectThread";

type Tutor = { id: string; name: string };

// Learner's messaging hub: the D-Maths team (admin) thread plus a tab per
// assigned tutor. The admin thread keeps its full MessagesClient (voice notes
// etc.); tutor threads use the lighter DirectThread.
export default function LearnerMessages({ meId, initialMessages, tutors }: {
  meId: string; initialMessages: any[]; tutors: Tutor[];
}) {
  const [tab, setTab] = useState<string>("admin");

  return (
    <div className="space-y-4">
      {tutors.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <TabButton active={tab === "admin"} onClick={() => setTab("admin")}>D-Maths team</TabButton>
          {tutors.map((t) => (
            <TabButton key={t.id} active={tab === t.id} onClick={() => setTab(t.id)}>{t.name}</TabButton>
          ))}
        </div>
      )}

      {tab === "admin" ? (
        <MessagesClient meId={meId} initialMessages={initialMessages} />
      ) : (
        <DirectThread
          key={tab}
          channel={`chat-${meId}-t-${tab}`}
          studentId={meId}
          tutorId={tab}
          meRole="student"
          otherName={tutors.find((t) => t.id === tab)?.name ?? "Tutor"}
          sendParams={{ tutorId: tab }}
        />
      )}
    </div>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick}
      className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${active ? "bg-gold text-board shadow" : "bg-chalk text-ink/60 hover:bg-chalk/70"}`}>
      {children}
    </button>
  );
}
