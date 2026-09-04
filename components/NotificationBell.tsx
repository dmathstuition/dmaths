"use client";
import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabase/client";
import { Icon, type IconName } from "@/components/Icons";

// A notification's title often starts with an emoji (e.g. "🎁 Your daily…").
// We show a proper category icon instead, so strip a leading emoji/symbol.
const stripLeadEmoji = (t: string) => String(t ?? "").replace(/^[^\p{L}\p{N}]+/u, "").trim() || String(t ?? "");

// Pick a category icon + tint from the notification's words, so the list reads
// at a glance instead of as a wall of identical text.
function categoryOf(title: string, body: string): { icon: IconName; tint: string } {
  const s = `${title} ${body}`.toLowerCase();
  if (/reward|chest|point|gift|coin/.test(s)) return { icon: "gift", tint: "bg-amber-100 text-amber-600" };
  if (/invoice|tuition|payment|due|receipt|paid|₦/.test(s)) return { icon: "payments", tint: "bg-emerald-100 text-emerald-600" };
  if (/aptitude|report|result|grade|score/.test(s)) return { icon: "reports", tint: "bg-gold-pale text-gold-deep" };
  if (/class|session|live|lesson|reminder/.test(s)) return { icon: "classes", tint: "bg-sky-100 text-sky-600" };
  if (/message|reply/.test(s)) return { icon: "messages", tint: "bg-indigo-100 text-indigo-600" };
  if (/welcome|congrat|badge|trophy|winner|won|champion|league/.test(s)) return { icon: "trophy", tint: "bg-violet-100 text-violet-600" };
  if (/streak|week|progress|average|nudge|quest/.test(s)) return { icon: "progress", tint: "bg-blue-100 text-blue-600" };
  return { icon: "bell", tint: "bg-ink/5 text-ink/50" };
}

// Compact relative time ("just now", "3h ago", "2d ago"), then a short date.
function relTime(iso: string): string {
  const t = new Date(iso).getTime();
  if (isNaN(t)) return "";
  const s = Math.max(0, Math.floor((Date.now() - t) / 1000));
  if (s < 60) return "just now";
  const m = Math.floor(s / 60); if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60); if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24); if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString("en-NG", { day: "numeric", month: "short" });
}

// Reads each user's OWN notifications from the notifications table (per-user,
// enforced by RLS). Works the same for students and admins — each only ever
// sees rows where user_id = their own id.
export default function NotificationBell({ mode, noticesHref }: { mode?: string; subjects?: string[]; noticesHref: string }) {
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
    // Esc closes it and hands focus back to the bell, so a keyboard user is
    // never left inside a panel they can't dismiss.
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      setOpen((o) => {
        if (o) ref.current?.querySelector("button")?.focus();
        return false;
      });
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onClick); document.removeEventListener("keydown", onKey); };
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
      <button onClick={toggle} aria-expanded={open} aria-haspopup="menu"
        aria-label={unread > 0 ? `Notifications, ${unread} unread` : "Notifications"}
        className="relative flex h-11 w-11 items-center justify-center rounded-lg bg-ink/5 text-ink/70 transition hover:bg-ink/10 active:scale-95 dark:bg-white/10 dark:text-white">
        <Icon name="notices" />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center">
            <span aria-hidden className="absolute inset-0 animate-ping rounded-full bg-gold/60" />
            <span className="relative flex h-5 min-w-[20px] items-center justify-center rounded-full bg-gold px-1 text-[10px] font-bold text-board shadow-sm">
              {unread > 9 ? "9+" : unread}
            </span>
          </span>
        )}
      </button>

      {open && (
        <div role="menu" aria-label="Notifications"
          className="pop-in absolute right-0 z-50 mt-2 w-[22rem] max-w-[calc(100vw-1.25rem)] overflow-hidden rounded-2xl bg-white shadow-[0_20px_50px_-16px_rgba(16,64,111,.4)] ring-1 ring-black/5 dark:bg-board dark:ring-white/10">
          {/* Header */}
          <div className="flex items-center gap-2 px-4 pb-2.5 pt-4">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gold-pale text-gold-deep dark:bg-gold/15 dark:text-gold">
              <Icon name="notices" className="h-4 w-4" />
            </span>
            <p className="font-display text-[15px] font-bold text-ink dark:text-white">Notifications</p>
            {unread > 0 && (
              <span className="ml-auto rounded-full bg-gold px-2 py-0.5 text-[10px] font-extrabold text-board">{unread} new</span>
            )}
          </div>

          {/* List */}
          <div className="max-h-[24rem] overflow-y-auto px-2 pb-1">
            {items.length === 0 ? (
              <div className="flex flex-col items-center gap-2 px-4 py-12 text-center">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-chalk text-ink/30 dark:bg-white/5"><Icon name="notices" className="h-5 w-5" /></span>
                <p className="text-sm font-semibold text-ink/45">You&apos;re all caught up</p>
                <p className="text-xs text-ink/35">New alerts will show up here.</p>
              </div>
            ) : (
              <div className="space-y-0.5">
                {items.map(n => {
                  const c = categoryOf(n.title ?? "", n.body ?? "");
                  const inner = (
                    <div className={`group relative flex gap-3 rounded-xl px-2.5 py-2.5 transition hover:bg-chalk dark:hover:bg-white/5 ${!n.read ? "bg-gold-pale/30 dark:bg-gold/10" : ""}`}>
                      {!n.read && <span aria-hidden className="absolute left-0 top-2.5 h-[calc(100%-1.25rem)] w-1 rounded-full bg-gold" />}
                      <span className={`mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl ${c.tint}`}>
                        <Icon name={c.icon} className="h-[18px] w-[18px]" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start gap-2">
                          <p className="flex-1 text-[13.5px] font-bold leading-snug text-ink dark:text-white">{stripLeadEmoji(n.title)}</p>
                          {!n.read && <span aria-hidden className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-gold" />}
                        </div>
                        {n.body && <p className="mt-0.5 line-clamp-2 text-[12.5px] leading-snug text-ink/55 dark:text-white/50">{n.body}</p>}
                        <p className="mt-1 text-[11px] font-semibold text-ink/35">{relTime(n.created_at)}</p>
                      </div>
                    </div>
                  );
                  return n.link
                    ? <Link key={n.id} href={n.link} onClick={() => setOpen(false)} className="block">{inner}</Link>
                    : <div key={n.id}>{inner}</div>;
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-line/70 p-2 dark:border-white/10">
            <Link href={mode === "student" ? "/portal/notifications" : noticesHref} onClick={() => setOpen(false)}
              className="flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-bold text-gold-deep transition hover:bg-gold-pale/60 dark:hover:bg-white/5">
              View all <span aria-hidden>→</span>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
