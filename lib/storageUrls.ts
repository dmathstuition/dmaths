// Storage URL helpers.
//
// Teaching content (materials, curricula, assignment sheets) lives in PUBLIC
// buckets — it is handed out to learners anyway. Two buckets hold things that
// are nobody else's business and are now PRIVATE:
//
//   submissions  — a child's own uploaded work
//   voice-notes  — private chat audio
//
// A private object can only be read through a short-lived signed URL, minted by
// /api/files/download after it has checked who is asking. That means a leaked
// link (forwarded email, shared computer, browser history) stops working within
// minutes instead of never expiring.

export const PRIVATE_BUCKETS = ["submissions", "voice-notes"] as const;
export type PrivateBucket = (typeof PRIVATE_BUCKETS)[number];

export function isPrivateBucket(bucket: string): bucket is PrivateBucket {
  return (PRIVATE_BUCKETS as readonly string[]).includes(bucket);
}

// Pull the bucket + object path back out of a stored Supabase storage URL.
// Handles both shapes so rows written before the buckets were locked down keep
// working untouched:
//   /storage/v1/object/public/<bucket>/<path>
//   /storage/v1/object/sign/<bucket>/<path>?token=…
export function parseStorageUrl(url: string): { bucket: string; path: string } | null {
  if (!url) return null;
  const m = url.match(/\/storage\/v1\/object\/(?:public|sign)\/([^/]+)\/(.+?)(?:\?|$)/);
  if (!m) return null;
  try {
    return { bucket: decodeURIComponent(m[1]), path: decodeURIComponent(m[2]) };
  } catch {
    return null;
  }
}

// What to put in an <a href> or <audio src>. Private objects go through the
// guarded route; anything else (public teaching content, an external link) is
// returned unchanged, so callers can use this everywhere without thinking.
export function fileHref(url: string | null | undefined): string {
  if (!url) return "";
  const parsed = parseStorageUrl(url);
  if (!parsed || !isPrivateBucket(parsed.bucket)) return url;
  return `/api/files/download?u=${encodeURIComponent(url)}`;
}
