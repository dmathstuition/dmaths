/**
 * Lightweight in-memory rate limiter for API routes.
 *
 * Honest caveat: on Vercel serverless, each function instance has its own
 * memory, so this is per-instance, not global. It still stops naive abuse
 * (rapid-fire scripts hitting one warm instance) at zero cost. For
 * bulletproof global limiting you'd need Upstash Redis (~free tier exists).
 */
const hits = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(key: string, max = 20, windowMs = 60_000): boolean {
  const now = Date.now();
  const entry = hits.get(key);

  if (!entry || now > entry.resetAt) {
    hits.set(key, { count: 1, resetAt: now + windowMs });
    return true; // allowed
  }
  if (entry.count >= max) return false; // blocked
  entry.count++;
  return true;
}

export function clientKey(req: Request, scope: string): string {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";
  return `${scope}:${ip}`;
}
