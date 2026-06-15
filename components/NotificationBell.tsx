"use client";
import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabase/client";
import { Icon } from "@/components/Icons";

// Reads each user's OWN notifications from the notifications table (per-user,
// enforced by RLS). Works the same for students and admins — each only ever
// sees rows where user_id = their own id.
export default function NotificationBell({ noticesHref }: { mode?: string; subjects?: string[]; noticesHref: string }) {
  const supabase = supabaseBrowser();
  const [items, setItems] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  async function load() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from("notifications")
      .select("*").eq("user_id", user.id)
      .order("created_at", { ascending: false }).limit(30);
    setItems(data ?? []);
  }

  useEffect(() => {
    load();
    const i = setInterval(load, 45000);
    return () => clearInterval(i);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    function onClick(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const unread = items.filter(n => !n.read).length;

  async function markAllRead() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const ids = items.filter(n => !n.read).map(n => n.id);
    if (!ids.length) return;
    await supabase.from("notifications").update({ read: true }).in("id", ids);
    setItems(items.map(n => ({ ...n, read: true })));
  }

  function toggle() {
    setOpen(o => {
      const next = !o;
      if (next && unread) markAllRead();
      return next;
    });
  }

  return (
    <div ref={ref} className="relative">
      <button onClick={toggle} aria-label="Notifications"
        className="relative rounded-lg bg-ink/5 p-2.5 text-ink/70 transition hover:bg-ink/10 active:scale-95 dark:bg-white/10 dark:text-white">
        <Icon name="notices" />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-gold px-1 text-[10px] font-bold text-board">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/5 dark:bg-board dark:ring-white/10">
          <div className="flex items-center justify-between border-b border-line px-4 py-3 dark:border-white/10">
            <p className="font-display font-semibold text-ink dark:text-white">Notifications</p>
            {unread > 0 && <span className="rounded-full bg-gold-pale px-2 py-0.5 text-[10px] font-bold text-gold-deep">{unread} new</span>}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {items.length === 0 && <p className="px-4 py-8 text-center text-sm text-ink/40">Nothing yet.</p>}
            {items.map(n => {
              const inner = (
                <div className={`border-b border-line/60 px-4 py-3 dark:border-white/5 ${!n.read ? "bg-gold-pale/40 dark:bg-gold/10" : ""}`}>
                  <p className="text-sm font-bold text-ink dark:text-white">{n.title}</p>
                  {n.body && <p className="mt-0.5 line-clamp-2 text-xs text-ink/55 dark:text-white/50">{n.body}</p>}
                  <p className="mt-1 text-[10px] text-ink/35">{new Date(n.created_at).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" })}</p>
                </div>
              );
              return n.link
                ? <Link key={n.id} href={n.link} onClick={() => setOpen(false)} className="block hover:bg-chalk dark:hover:bg-white/5">{inner}</Link>
                : <div key={n.id}>{inner}</div>;
            })}
          </div>
          <Link href={noticesHref} onClick={() => setOpen(false)}
            className="block border-t border-line px-4 py-3 text-center text-sm font-semibold text-gold-deep hover:bg-chalk dark:border-white/10 dark:hover:bg-white/5">
            View all
          </Link>
        </div>
      )}
    </div>
  );
}
