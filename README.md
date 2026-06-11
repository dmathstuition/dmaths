# D-Maths Portal v2 — Next.js + Supabase + Apps Script Email

A full rebuild of the D-Maths single-file portal into a production stack:

| Layer        | Old                          | New                                        |
|--------------|------------------------------|--------------------------------------------|
| Frontend     | One 3,000-line HTML file     | Next.js 14 (App Router) + Tailwind         |
| Database     | Google Sheets                | Supabase Postgres (free tier)              |
| Auth         | Passwords in a Sheet         | Supabase Auth (bcrypt, sessions, reset links) |
| Authorization| Client-side `requireAdmin()` | Server middleware + Postgres Row Level Security |
| Email        | Apps Script (kept)           | Apps Script relay, server-to-server only   |
| Hosting      | Static file                  | Vercel (free tier)                         |

**Why this matters:** in the old app, the Apps Script URL was public and every
read endpoint (`getStudents`, `getApps`…) was callable by anyone — your whole
student database (names, phones, guardians, payment refs) was effectively
public. Rate limiting and role checks lived in the browser, so they protected
nothing. This rebuild moves every security decision to the server/database.

---

## GO-LIVE CHECKLIST (do these in order)

### 1. Create the Supabase project (~10 min)
1. Go to **supabase.com → New project**. Pick a strong DB password, region
   closest to your users (Frankfurt `eu-central-1` works well for Nigeria).
2. Open **SQL Editor → New query**, paste the entire contents of
   `supabase/schema.sql`, and run it. It creates all tables, triggers, and
   Row Level Security policies.
3. Create your admin account:
   - **Authentication → Users → Add user** → your email + password, tick
     **Auto confirm**.
   - Copy the new user's UUID, then run in SQL Editor:
     ```sql
     insert into profiles (id, role, first_name, last_name, email)
     values ('PASTE-UUID', 'admin', 'Oladapo', 'Bakare', 'dmathstuition@gmail.com');
     ```
4. **Project Settings → API**: copy the **URL**, **anon key**, and
   **service_role key** — you'll need them in step 3.

### 2. Deploy the email relay (~10 min)
1. Go to **script.google.com → New project** (signed in as
   dmathstuition@gmail.com so emails come from your address).
2. Paste `apps-script/EmailService.gs`. Replace `EMAIL_SECRET` with a long
   random string (run `openssl rand -hex 32` or use a password generator).
3. **Deploy → New deployment → Web app**:
   - Execute as: **Me**
   - Who has access: **Anyone**
4. Copy the `/exec` URL.

> Quota warning: consumer Gmail sends max **100 emails/day** (1,500 on Google
> Workspace). At 200 students this is fine for credentials and grading emails,
> but do NOT email every student on every announcement. If you outgrow it,
> swap `lib/email.ts` to Resend (free 3,000/month) — it's a 20-line change.

### 3. Deploy the app to Vercel (~15 min)
1. Push this folder to a GitHub repo.
2. **vercel.com → New project → import the repo.** Framework auto-detects Next.js.
3. Add these Environment Variables (from `.env.example`):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`  ← server-only, never shown to browsers
   - `EMAIL_RELAY_URL`             ← the Apps Script /exec URL
   - `EMAIL_RELAY_SECRET`          ← same value as in EmailService.gs
   - `NEXT_PUBLIC_SITE_URL`        ← your Vercel URL (update after first deploy)
4. Deploy. Then in **Supabase → Authentication → URL Configuration**, set
   **Site URL** to your Vercel URL (needed for password-reset links).

### 4. Migrate your existing students (~30–60 min)
Your old data lives in Google Sheets. Migrate it once:
1. In the old Sheet, **File → Download → CSV** for the Students tab.
2. In Supabase **Table Editor → applications → Insert → Import from CSV** is
   the easy path for pending applications. For *existing active students* you
   need auth accounts too, so the cleanest route is: re-enter them as
   "applications" (CSV import, status `pending`), then click **Approve** in
   the new admin panel for each — this creates their login, generates a fresh
   `DM-2026-XXXX` ID, and emails them new credentials automatically.
3. Old student IDs will change. Tell students to expect a "Welcome" email
   with their new ID. (Their old plaintext-in-a-Sheet passwords should be
   retired regardless.)
4. When migration is verified, **disable the old Apps Script deployment**
   (Deploy → Manage deployments → Archive) so the old open endpoints stop
   serving data.

### 5. Smoke test before announcing
- [ ] Submit an application from `/apply` on your phone.
- [ ] Approve it in `/admin/applications` → confirm the credentials email arrives.
- [ ] Log in at `/login` with the Student ID from the email.
- [ ] Create a class with that student assigned → confirm it shows in `/portal/classes`.
- [ ] Create an assignment → student marks submitted → admin grades → confirm grade email.
- [ ] Try opening `/admin` while logged in as the student → you should be bounced to `/portal`.

### 6. Custom domain (optional)
Vercel → Project → Domains → add `dmaths.com.ng` (₦ from any registrar).
Update `NEXT_PUBLIC_SITE_URL` and Supabase Site URL afterwards.

---

## Local development

```bash
npm install
cp .env.example .env.local   # fill in your keys
npm run dev                   # http://localhost:3000
```

---

## What's implemented vs. what's next

**Done (end-to-end):** landing page, 3-step application, admin review with
approve/reject + credential emails, Student-ID login, password reset & change,
student/admin dashboards, classes (create, assign roster, join links,
attendance with auto-recalculated %), assignments (written + CBT with open/close
windows, per-student submission status, grading + grade emails), announcements
(targeted by subject), student profile, CSV export, server-side audit log.

**Phase 2 (port when you're stable):**
- **Reports page** — the activity-score ranking and charts. All data is one
  SQL query away; add Recharts and a `/admin/reports` page.
- **Rewards** — `rewards` table already exists in the schema; add a button on
  the students page that inserts a row and (optionally) emails the student.
- **Admin notes** — `admin_notes` table exists; add a notes panel to a student
  detail page.
- **Dark mode** — add `darkMode: "class"` to Tailwind and a toggle.
- **Email announcements** — loop `sendEmail("notice", …)` over targeted
  students inside a new API route (watch the Gmail daily quota).

## Architecture rules (don't break these)
1. The **service_role key** and **EMAIL_RELAY_SECRET** exist only in Vercel
   env vars and API routes — never in a `"use client"` file.
2. Anything that must be trusted (approve, grade, emails) goes through an
   `/api` route that re-checks the caller's role server-side.
3. Everything else talks to Supabase directly from the browser — RLS policies
   in `schema.sql` are the real gatekeeper, not the UI.

## Monthly cost at your scale (200 students)
Supabase free tier (500MB DB, 50k monthly active users) + Vercel free tier +
Gmail = **₦0/month**. First paid threshold is Supabase Pro ($25/mo) at roughly
10× your current size.
