// ── D-MATHS BLOG — shared helpers ────────────────────────────────────
// One source of truth for the blog's shape, the admin's presentation
// choices ("designed in different form"), and small formatting utilities
// used by both the public pages and the admin editor.

export type BlogPost = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  body: string;
  cover_url: string;
  category: string;
  tags: string[];
  layout: BlogLayout;
  accent: BlogAccent;
  status: "draft" | "published";
  author: string;
  featured: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

export type BlogSubscriber = {
  id: string;
  email: string;
  source: string;
  unsubscribed_at: string | null;
  created_at: string;
};

export type BlogComment = {
  id: string;
  post_id: string;
  author_name: string;
  body: string;
  status: "pending" | "approved";
  client_id: string | null;
  created_at: string;
};

// The emoji reactions a visitor can leave on a post.
export const REACTIONS = [
  { emoji: "👍", label: "Helpful" },
  { emoji: "❤️", label: "Love it" },
  { emoji: "🎉", label: "Celebrate" },
  { emoji: "💡", label: "Insightful" },
] as const;

// A stable per-browser id (anonymous), used to let a visitor toggle their own
// reactions and to lightly dedupe. Browser-only; returns "" on the server.
export function getClientId(): string {
  if (typeof window === "undefined") return "";
  try {
    let id = localStorage.getItem("dmaths_cid");
    if (!id) {
      id = (crypto?.randomUUID?.() ?? `c${Date.now()}${Math.random().toString(36).slice(2)}`);
      localStorage.setItem("dmaths_cid", id);
    }
    return id;
  } catch { return ""; }
}

// The layouts an admin can pick per post — this is what lets each post be
// "designed in a different form".
export const LAYOUTS = [
  { id: "standard", label: "Standard", hint: "Centred article with a cover image on top." },
  { id: "wide", label: "Wide feature", hint: "Full-width cover hero — great for announcements." },
  { id: "minimal", label: "Minimal", hint: "Text-first, no big cover — clean and quiet." },
] as const;
export type BlogLayout = (typeof LAYOUTS)[number]["id"];

// Accent colours an admin can pick per post.
export const ACCENTS = [
  { id: "gold", label: "Gold" },
  { id: "navy", label: "Navy" },
  { id: "green", label: "Green" },
  { id: "plum", label: "Plum" },
] as const;
export type BlogAccent = (typeof ACCENTS)[number]["id"];

// Tailwind class fragments for each accent, so a post's chosen colour flows
// through its card and its page consistently.
export const ACCENT_CLASSES: Record<BlogAccent, { text: string; bg: string; softBg: string; border: string; ring: string }> = {
  gold:  { text: "text-gold-deep",   bg: "bg-gold",       softBg: "bg-gold/12",       border: "border-gold/40",       ring: "ring-gold" },
  navy:  { text: "text-board",       bg: "bg-board",      softBg: "bg-board/10",      border: "border-board/30",      ring: "ring-board" },
  green: { text: "text-emerald-700", bg: "bg-emerald-600", softBg: "bg-emerald-500/12", border: "border-emerald-500/40", ring: "ring-emerald-500" },
  plum:  { text: "text-purple-700",  bg: "bg-purple-600", softBg: "bg-purple-500/12", border: "border-purple-500/40", ring: "ring-purple-500" },
};

export function accentOf(a: string | null | undefined) {
  return ACCENT_CLASSES[(a as BlogAccent)] ?? ACCENT_CLASSES.gold;
}

// Turn a title into a URL-safe slug.
export function slugify(s: string): string {
  return (s || "")
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "post";
}

// A short preview: prefer the excerpt, else the first bit of the body with
// its light markup stripped.
export function previewOf(p: { excerpt?: string; body?: string }, max = 160): string {
  const raw = (p.excerpt && p.excerpt.trim()) || (p.body || "");
  const plain = raw.replace(/[#*_>`-]/g, " ").replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").replace(/\s+/g, " ").trim();
  return plain.length > max ? plain.slice(0, max).trimEnd() + "…" : plain;
}

// Estimated reading time from the body.
export function readingTime(body: string): string {
  const words = (body || "").trim().split(/\s+/).filter(Boolean).length;
  const mins = Math.max(1, Math.round(words / 200));
  return `${mins} min read`;
}

export function formatDate(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-NG", { day: "numeric", month: "long", year: "numeric" });
}

// A very small e-mail sanity check (server + client share it).
export function isEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((s || "").trim());
}
