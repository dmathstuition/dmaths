/// <reference lib="webworker" />
// D-Maths service worker (Serwist). Compiled separately by @serwist/next, so
// it is excluded from the main tsconfig typecheck.
//
// Caching is deliberately CONSERVATIVE for a portal with auth + payments:
//  • Private/auth/API routes (/api, /admin, /portal, /auth, /login,
//    /reset-password) are NEVER cached — always network. This respects the
//    `no-store` headers in next.config.mjs and avoids serving stale private data.
//  • Only immutable build assets, images/fonts and PUBLIC navigations are cached.
//  • When a public page is requested offline, the branded /offline page is shown.

import type { PrecacheEntry, RuntimeCaching, SerwistGlobalConfig } from "serwist";
import {
  Serwist,
  NetworkFirst,
  NetworkOnly,
  CacheFirst,
  StaleWhileRevalidate,
  ExpirationPlugin,
  CacheableResponsePlugin,
} from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}
declare const self: ServiceWorkerGlobalScope;

// Anything authenticated, dynamic, or payment-related must never be cached.
const PRIVATE = /^\/(api|admin|portal|auth|login|reset-password)(\/|$)/;

const runtimeCaching: RuntimeCaching[] = [
  // 1) Private / auth / API — network only, never stored. (Order matters: first.)
  {
    matcher: ({ url, sameOrigin }) => sameOrigin && PRIVATE.test(url.pathname),
    handler: new NetworkOnly(),
  },
  // 2) Immutable, hashed Next build assets — cache first.
  {
    matcher: ({ url, sameOrigin }) => sameOrigin && url.pathname.startsWith("/_next/static"),
    handler: new CacheFirst({
      cacheName: "next-static",
      plugins: [new ExpirationPlugin({ maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 })],
    }),
  },
  // 3) Images / fonts (icons, brand art) — stale-while-revalidate.
  {
    matcher: ({ request, sameOrigin }) =>
      sameOrigin && (request.destination === "image" || request.destination === "font"),
    handler: new StaleWhileRevalidate({
      cacheName: "assets",
      plugins: [
        new CacheableResponsePlugin({ statuses: [0, 200] }),
        new ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 30 }),
      ],
    }),
  },
  // 4) Google Fonts.
  {
    matcher: ({ url }) =>
      url.origin === "https://fonts.googleapis.com" || url.origin === "https://fonts.gstatic.com",
    handler: new StaleWhileRevalidate({ cacheName: "google-fonts" }),
  },
  // 5) Public page navigations — network first; offline falls back to /offline.
  {
    matcher: ({ request, sameOrigin }) => sameOrigin && request.mode === "navigate",
    handler: new NetworkFirst({
      cacheName: "pages",
      plugins: [
        new CacheableResponsePlugin({ statuses: [200] }),
        new ExpirationPlugin({ maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 }),
      ],
    }),
  },
];

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching,
  fallbacks: {
    entries: [
      {
        url: "/offline",
        matcher: ({ request }) => request.destination === "document",
      },
    ],
  },
});

serwist.addEventListeners();

// ── Web Push ──────────────────────────────────────────────────────────
// Payload (from lib/push/send.ts) is JSON: { title, body, url }.
self.addEventListener("push", (event: PushEvent) => {
  let data: { title?: string; body?: string; url?: string } = {};
  try {
    data = event.data?.json() ?? {};
  } catch {
    data = { title: event.data?.text() };
  }
  const title = data.title || "D-Maths";
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || "",
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      data: { url: data.url || "/" },
    }),
  );
});

// Focus an open tab on the target URL, or open a new one.
self.addEventListener("notificationclick", (event: NotificationEvent) => {
  event.notification.close();
  const url = (event.notification.data as { url?: string })?.url || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ("focus" in client) {
          (client as WindowClient).navigate(url);
          return (client as WindowClient).focus();
        }
      }
      return self.clients.openWindow(url);
    }),
  );
});
