"use client";
import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabase/client";
import { Icon } from "@/components/Icons";

export default function NotificationBell({ subjects }: { subjects: string[] }) {
  const supabase = supabaseBrowser();
  const [notices, setNotices] = useState<any[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  async function load() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const [{ data: all }, { data: reads }] = await Promise.all([
      supabase.from("notices").select("*").order("created_at", { ascending: false }).limit(20),
      supabase.from("notice_reads").select("notice_id").eq("student_id", user.id),
    ]);
    // filter to this student's targets
    const mine = (all ?? []).filter(n => n.target === "all" || subjects.includes(n.target));
    setNotices(mine);
    setReadIds(new Set((reads ?? []).map(r => r.notice_id)));
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, 60000); // refresh every minute
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // close on outside click
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const unread = notices.filter(n => !readIds.has(n.id));

  async function markAllRead() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const toInsert = unread.map(n => ({ notice_id: n.id, student_id: user.id }));
    if (toInsert.length) {
      await supabase.from("notice_reads").upsert(toInsert, { onConflict: "notice_id,student_id" });
      setReadIds(new Set([...readIds, ...unread.map(n => n.id)]));
    }
  }

  function toggle() {
    setOpen(o => {
      const next = !o;
      if (next && unread.length) markAllRead();
      return next;
    });
  }

  return (
    <div ref={ref} className="relative">
      <button onClick={toggle} aria-label="Notifications"
        className="relative rounded-lg bg-white/10 p-2.5 text-white transition active:scale-95">
        <Icon name="notices" />
        {unread.length > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-gold px-1 text-[10px] font-bold text-board">
            {unread.length > 9 ? "9+" : unread.length}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/5">
          <div className="border-b border-line px-4 py-3">
            <p className="font-display font-semibold text-ink">Notifications</p>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {notices.length === 0 && <p className="px-4 py-8 text-center text-sm text-ink/40">No notifications yet.</p>}
            {notices.map(n => (
              <div key={n.id} className={`border-b border-line/60 px-4 py-3 ${!readIds.has(n.id) ? "bg-gold-pale/40" : ""}`}>
                <p className="text-sm font-bold text-ink">{n.title}</p>
                <p className="mt-0.5 line-clamp-2 text-xs text-ink/55">{n.body}</p>
                <p className="mt-1 text-[10px] text-ink/35">
                  {new Date(n.created_at).toLocaleDateString("en-NG", { dateStyle: "medium" })}
                  {n.target !== "all" && ` · ${n.target}`}
                </p>
              </div>
            ))}
          </div>
          <Link href="/portal/notices" onClick={() => setOpen(false)}
            className="block border-t border-line px-4 py-3 text-center text-sm font-semibold text-gold-deep hover:bg-chalk">
            View all notices
          </Link>
        </div>
      )}
    </div>
  );
}
