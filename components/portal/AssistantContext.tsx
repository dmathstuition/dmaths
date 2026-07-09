"use client";
import { createContext, useContext, useState } from "react";

// Lets any page in the learner portal tell the floating assistant what the learner
// is currently working on (e.g. the coding assignment they just opened), so Dexter's
// hints land on the right task. Defaults are a no-op, so the widget also works when
// no provider is mounted (e.g. the tutor/admin portals).
type Ctx = { task: string | undefined; setTask: (t: string | undefined) => void };
const AssistantCtx = createContext<Ctx>({ task: undefined, setTask: () => {} });

export function AssistantProvider({ children }: { children: React.ReactNode }) {
  const [task, setTask] = useState<string | undefined>(undefined);
  return <AssistantCtx.Provider value={{ task, setTask }}>{children}</AssistantCtx.Provider>;
}

export function useAssistantTask() {
  return useContext(AssistantCtx);
}
