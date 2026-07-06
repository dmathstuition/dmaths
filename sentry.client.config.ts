// Sentry — browser SDK. Runs only when NEXT_PUBLIC_SENTRY_DSN is set, so the
// app is a complete no-op (zero network, zero overhead) without a DSN — which
// is the case in CI, local dev, and any deploy that hasn't opted in.
import * as Sentry from "@sentry/nextjs";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    // Keep it light for the free tier: sample a slice of traces, no Session Replay.
    tracesSampleRate: 0.1,
    // Don't report noisy, expected client conditions.
    ignoreErrors: ["Network request failed", "Failed to fetch", "Load failed"],
  });
}
