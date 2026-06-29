# D-Maths Tuition Centre — Portal

Online tuition portal for D-Maths Tuition Centre (Asaba, Nigeria): enrolment, payments,
student/parent/admin dashboards, a Summer Camp campaign, and an installable app with
push notifications.

## Stack
- **Next.js 14** (App Router) on **Vercel**
- **Supabase** — Postgres, Auth, Row-Level Security
- **Paystack** — card/bank payments + signed webhook
- **Google Apps Script** — transactional email relay
- **PWA** — installable app, offline page, Web Push notifications

## Going live / configuration
See **[LAUNCH-CHECKLIST.md](./LAUNCH-CHECKLIST.md)** for the full operator guide:
environment variables, database migrations, email/Paystack/push setup, and how to edit
the site yourself (free, via the GitHub web editor — no developer needed).

## Local development
```bash
npm install
npm run dev      # http://localhost:3000
```
Create a `.env.local` with the variables listed in the launch checklist (at minimum the
`NEXT_PUBLIC_SUPABASE_*` and `SUPABASE_SERVICE_ROLE_KEY` values).

## Build & test
```bash
npm run build    # production build
npx vitest run   # unit/integration tests
```

## Project layout
- `app/` — routes, pages, and API route handlers (`app/api/**`)
- `components/` — UI components (portal shell, admin, landing, push manager…)
- `lib/` — shared logic (Supabase clients, email, Paystack, notifications, camp config)
- `supabase/` — SQL schema + idempotent migrations (and `delete-learner.sql`)
- `apps-script/` — the email relay script
