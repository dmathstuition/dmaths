"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabase/client";
import { Icon } from "@/components/Icons";
import { useToast } from "@/components/Toast";

type Note = { id: string; title: string; body: string | null; link: string | null; read: boolean; created_at: string };

function when(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return new Date(iso).toLocaleDateString("en-NG", { dateStyle: "medium" });
}

// Full notification history — everything the bell shows, plus older items,
// with unread filtering and mark-as-read. RLS lets a learner update only
// their own rows, so these writes go straight through the browser client.
export default function NotificationsClient({ initial }: { initial: Note[] }) {
  const push = useToast();
  const [notes, setNotes] = useState<Note[]>(initial);
  const [onlyUnread, setOnlyUnread] = useState(false);

  const unread = useMemo(() => notes.filter((n) => !n.read).length, [notes]);
  const visible = onlyUnread ? notes.filter((n) => !n.read) : notes;

  async function markRead(id: string) {
    setNotes((p) => p.map((n) => (n.id === id ? { ...n, read: true } : n)));
    await supabaseBrowser().from("notifications").update({ read: true }).eq("id", id);
  }

  async function markAll() {
    const ids = notes.filter((n) => !n.read).map((n) => n.id);
    if (!ids.length) return;
    setNotes((p) => p.map((n) => ({ ...n, read: true })));
    const { error } = await supabaseBrowser().from("notifications").update({ read: true }).in("id", ids);
    push(error ? "Could not mark all as read." : "All caught up.", error ? "error" : "success");
  }

  return (
    <div className="space-y-6">
      <div className="boardgrid relative flex items-center gap-4 overflow-hidden rounded-2xl bg-board p-7 text-white">
        <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-gold/15 text-gold ring-1 ring-gold/25">
          <Icon name="bell" className="h-6 w-6" />
        </span>
        <div>
          <h1 className="font-display text-2xl font-semibold sm:text-3xl">Notifications</h1>
          <p className="mt-1 text-sm text-white/50">
            {unread > 0 ? `${unread} unread` : "You're all caught up."}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {([["all", "All"], ["unread", "Unread"]] as const).map(([k, label]) => {
          const active = (k === "unread") === onlyUnread;
          return (
            <button key={k} onClick={() => setOnlyUnread(k === "unread")}
              className={`rounded-full px-4 py-1.5 text-sm font-bold transition ${active ? "bg-gold text-board" : "bg-chalk text-ink/55 hover:bg-chalk/70"}`}>
              {label}{k === "unread" && unread > 0 ? ` (${unread})` : ""}
            </button>
          );
        })}
        {unread > 0 && (
          <button onClick={markAll} className="ml-auto text-sm font-bold text-gold-deep hover:underline">Mark all as read</button>
        )}
      </div>

      <div className="card neu-card divide-y divide-line/60 overflow-hidden">
        {visible.map((n) => {
          const inner = (
            <div className={`flex items-start gap-3 px-5 py-4 ${n.read ? "" : "bg-gold/[0.06]"}`}>
              <span className={`mt-1 h-2 w-2 flex-shrink-0 rounded-full ${n.read ? "bg-transparent" : "bg-gold"}`} />
              <div className="min-w-0 flex-1">
                <p className={`text-sm ${n.read ? "font-semibold text-ink/70" : "font-bold text-ink"}`}>{n.title}</p>
                {n.body && <p className="mt-0.5 text-[13px] leading-relaxed text-ink/55">{n.body}</p>}
                <p className="mt-1 text-[11px] text-ink/35">{when(n.created_at)}</p>
              </div>
              {!n.read && (
                <button onClick={(e) => { e.preventDefault(); markRead(n.id); }}
                  className="flex-shrink-0 text-[11px] font-bold text-gold-deep hover:underline">Mark read</button>
              )}
            </div>
          );
          return n.link
            ? <Link key={n.id} href={n.link} onClick={() => markRead(n.id)} className="block transition hover:bg-chalk/50">{inner}</Link>
            : <div key={n.id}>{inner}</div>;
        })}
        {!visible.length && (
          <div className="flex flex-col items-center gap-2 py-14 text-ink/40">
            <Icon name="bell" className="h-8 w-8" />
            <p className="text-sm">{onlyUnread ? "Nothing unread." : "No notifications yet."}</p>
          </div>
        )}
      </div>
    </div>
  );
}
