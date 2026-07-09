"use client";
import { createContext, useContext, useState } from "react";

// Shared state for the floating Dexter assistant, so any page (or the code editor)
// can open it and tell it what the user is working on.
//  • task   — a description of the current task (e.g. the coding assignment opened),
//             set by a page so Dexter's replies are on-topic.
//  • draft  — the user's current editor code, attached when they tap "Ask Dexter"
//             from inside the IDE; cleared when the panel closes.
//  • open / setOpen — the panel's open state, so an in-editor button can open it.
//  • available — true only when a real provider is mounted, so buttons on public
//             pages (which have no assistant) can hide themselves.
type Ctx = {
  task?: string;
  setTask: (t?: string) => void;
  open: boolean;
  setOpen: (o: boolean) => void;
  available: boolean;
  draft?: string;
  ask: (draft?: string) => void;
};

const AssistantCtx = createContext<Ctx>({
  task: undefined, setTask: () => {}, open: false, setOpen: () => {},
  available: false, draft: undefined, ask: () => {},
});

export function AssistantProvider({ children }: { children: React.ReactNode }) {
  const [task, setTask] = useState<string | undefined>();
  const [openState, setOpenState] = useState(false);
  const [draft, setDraft] = useState<string | undefined>();

  // Closing the panel drops any editor code we were carrying, so it can't leak
  // into a later, unrelated conversation.
  const setOpen = (o: boolean) => { setOpenState(o); if (!o) setDraft(undefined); };
  const ask = (d?: string) => { setDraft(d); setOpenState(true); };

  return (
    <AssistantCtx.Provider value={{ task, setTask, open: openState, setOpen, available: true, draft, ask }}>
      {children}
    </AssistantCtx.Provider>
  );
}

export function useAssistantTask() {
  return useContext(AssistantCtx);
}
