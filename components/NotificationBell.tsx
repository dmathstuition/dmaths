"use client";
import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabase/client";
import { Icon } from "@/components/Icons";

// mode "student": only notices targeted to "all" or the student's subjects,
//                 with per-student read tracking (their own bell only).
// mode "admin":   recent announcements + pending applications count.
export default function NotificationBell({
  mode, subjects = [], noticesHref,
}: {
  mode: "student" | "admin";
  subjects?: string[];
  noticesHref: string;
}) {
  const supabase = supabaseBrowser();
  const [items, setItems] = useState<any[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [adminUnseen, setAdminUnseen] = useState(0);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  async function load() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    if (mode === "student") {
      const [{ data: all }, { data: reads }] = await Promise.all([
        supabase.from("notices").select("*").order("created_at", { ascending: false }).limit(20),
        supabase.from("notice_reads").select("notice_id").eq("student_id", user.id),
      ]);
      const mine = (all ?? []).filter(n => n.target === "all" || subjects.includes(n.target));
      setItems(mine);
      setReadIds(new Set((reads ?? []).map(r => r.notice_id)));
    } else {
      // admin: surface pending applications as the actionable alert
      const [{ data: apps }, { data: notices }] = await Promise.all([
        supabase.from("applications").select("id,first_name,last_name,created_at,status").eq("status", "pending").order("created_at", { ascending: false }).limit(20),
        supabase.from("notices").select("*").order("created_at", { ascending: false }).limit(10),
      ]);
      const appItems = (apps ?? []).map(a => ({
        id: "app-" + a.id, title: "New application", body: `${a.first_name} ${a.last_name} is awaiting approval`,
        created_at: a.created_at, kind: "app",
      }));
      const noticeItems = (notices ?? []).map(n => ({ ...n, kind: "notice" }));
      setItems([...appItems, ...noticeItems].sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at)));
      setAdminUnseen(appItems.length);
    }
  }

  useEffect(() => {
    load();
    const i = setInterval(load, 60000);
    return () => clearInterval(i);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    function onClick(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const unread = mode === "student" ? items.filter(n => !readIds.has(n.id)).length : adminUnseen;

  async function markStudentRead() {
    if (mode !== "student") return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const toRead = items.filter(n => !readIds.has(n.id));
    if (toRead.length) {
      await supabase.from("notice_reads").upsert(
        toRead.map(n => ({ notice_id: n.id, student_id: user.id })), { onConflict: "notice_id,student_id" });
      setReadIds(new Set([...readIds, ...toRead.map(n => n.id)]));
    }
  }

  function toggle() {
    setOpen(o => {
      const next = !o;
      if (next && mode === "student" && unread) markStudentRead();
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
          <div className="border-b border-line px-4 py-3 dark:border-white/10">
            <p className="font-display font-semibold text-ink dark:text-white">Notifications</p>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {items.length === 0 && <p className="px-4 py-8 text-center text-sm text-ink/40">Nothing new.</p>}
            {items.map(n => {
              const unseen = mode === "student" ? !readIds.has(n.id) : n.kind === "app";
              return (
                <div key={n.id} className={`border-b border-line/60 px-4 py-3 dark:border-white/5 ${unseen ? "bg-gold-pale/40 dark:bg-gold/10" : ""}`}>
                  <p className="text-sm font-bold text-ink dark:text-white">{n.title}</p>
                  <p className="mt-0.5 line-clamp-2 text-xs text-ink/55 dark:text-white/50">{n.body}</p>
                  <p className="mt-1 text-[10px] text-ink/35">
                    {new Date(n.created_at).toLocaleDateString("en-NG", { dateStyle: "medium" })}
                    {mode === "student" && n.target !== "all" && ` · ${n.target}`}
                  </p>
                </div>
              );
            })}
          </div>
          <Link href={noticesHref} onClick={() => setOpen(false)}
            className="block border-t border-line px-4 py-3 text-center text-sm font-semibold text-gold-deep hover:bg-chalk dark:border-white/10 dark:hover:bg-white/5">
            {mode === "admin" ? "Go to applications" : "View all notices"}
          </Link>
        </div>
      )}
    </div>
  );
}
