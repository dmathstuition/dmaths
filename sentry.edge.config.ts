// Sentry — Edge runtime (middleware, edge routes). Gated on
// NEXT_PUBLIC_SENTRY_DSN so it stays a no-op without a DSN.
import * as Sentry from "@sentry/nextjs";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    tracesSampleRate: 0.1,
  });
}
