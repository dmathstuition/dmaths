import withSerwistInit from "@serwist/next";
import { withSentryConfig } from "@sentry/nextjs";

/** @type {import('next').NextConfig} */

// Content-Security-Policy: defense-in-depth against XSS. Allows only the
// origins this portal actually uses (Supabase, Paystack, Google Fonts).
// 'unsafe-inline' on scripts is required by Next.js's hydration without a
// nonce setup; everything else is locked down.
const csp = [
  "default-src 'self'",
  // cdn.jsdelivr.net serves the Pyodide (in-browser Python) engine for the code playground.
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.paystack.co https://www.googletagmanager.com https://cdn.jsdelivr.net",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  "img-src 'self' data: blob: https:",
  "media-src 'self' blob: https://*.supabase.co", // chat voice notes
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.paystack.co https://script.google.com https://script.googleusercontent.com https://www.googletagmanager.com https://www.google-analytics.com https://*.google-analytics.com https://*.sentry.io https://cdn.jsdelivr.net",
  "frame-src https://checkout.paystack.com https://*.paystack.co",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
  // microphone=(self) lets the chat record voice notes; camera stays off
  // (assignment photos use the native file picker, which needs no permission).
  { key: "Permissions-Policy", value: "camera=(), microphone=(self), geolocation=()" },
  { key: "X-XSS-Protection", value: "1; mode=block" },
];

// Authenticated areas must never be cached (closes the back-button-after-
// logout hole at the HTTP layer; AuthGuard is the client-side backstop).
const noStore = [
  { key: "Cache-Control", value: "no-store, no-cache, must-revalidate, max-age=0" },
  { key: "Pragma", value: "no-cache" },
];

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  experimental: {
    serverComponentsExternalPackages: ["@supabase/ssr", "web-push"],
  },
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
  },
  async headers() {
    return [
      { source: "/(.*)", headers: securityHeaders },
      { source: "/portal/:path*", headers: noStore },
      { source: "/admin/:path*", headers: noStore },
    ];
  },
};

// Service worker / PWA (Serwist). Disabled in dev so it never caches while
// developing; in production it compiles app/sw.ts → public/sw.js.
const withSerwist = withSerwistInit({
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development",
  reloadOnOnline: true,
});

// Sentry (error monitoring) wraps the already-Serwist-wrapped config. It stays
// inert at runtime unless NEXT_PUBLIC_SENTRY_DSN is set, and source-map upload
// is skipped when SENTRY_AUTH_TOKEN is absent — so CI builds pass unchanged.
export default withSentryConfig(withSerwist(nextConfig), {
  silent: true,
  widenClientFileUpload: true,
});
