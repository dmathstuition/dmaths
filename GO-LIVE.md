# 🏁 D-Maths — Go-Live Runbook

**One sitting, in order.** `LAUNCH-CHECKLIST.md` is the encyclopedia; this is the
recipe. Do the steps top to bottom — each one has a **✅ Check** so you never move on
wondering whether it worked.

**Total time:** ~60–90 minutes, most of it waiting on copy/paste.
**You need open:** Supabase dashboard · Vercel dashboard · cron-job.org · your phone.

> **Golden rule:** any time you add or change an **environment variable** in Vercel, you
> must **Redeploy** before it takes effect.

---

## Step 0 — Before you start (2 min)

Have these to hand (Vercel → Settings → Environment Variables):

- `CRON_SECRET` — you'll paste it into 5 cron jobs.
- Your live site host. **Use the one that does NOT redirect** (see Step 4). Throughout
  this runbook that's written as `<HOST>` — replace it with e.g. `https://dmaths.vercel.app`.

---

## Step 1 — Run the database migrations (20–30 min)

Supabase → **SQL Editor → New query**. Open each file in `supabase/`, paste, **Run**.
They're **idempotent** — if you're unsure whether one was already run, run it again.

Go in the numbered order in `LAUNCH-CHECKLIST.md` §2 (1 → 38). If the project already has
data, **skip `schema.sql`**.

The most recently added ones — likely still outstanding:

| # | File | Unlocks |
|---|---|---|
| 31 | `migration-certificates.sql` | Certificates |
| 32 | `migration-scheduled-broadcasts.sql` | Scheduled broadcasts |
| 33 | `migration-report-cards.sql` | Report cards |
| 34 | `migration-lesson-notes.sql` | Lesson log |
| 35 | `migration-daily-tasks.sql` | Task of the day |
| 36 | `migration-study-sessions.sql` | Focus mode |
| 37 | `migration-flashcards.sql` | Revision cards |
| 38 | `migration-email-log.sql` | Stops duplicate reminder emails — **required** before the assignment/guardian crons |
| 39 | `migration-cron-runs.sql` | Scheduled-job heartbeat behind **Admin → System health** |
| 40 | `migration-schema-fixes.sql` | **Run last** — patches anything missing |

Then run **`storage-buckets.sql`** (file uploads fail with "Bucket not found" without it).

> **Re-run `storage-buckets.sql` even if you ran it before.** It now makes
> `submissions` (children's uploaded work) and `voice-notes` (private chat audio)
> **private**. Those files are served through a signed link that expires in 5 minutes,
> so a forwarded URL stops working instead of being readable by anyone, forever.
> Old links people already copied will stop working — that is the fix, not a fault.

**✅ Check:** Supabase → **Table Editor** — you can see `certificates`, `report_cards`,
`lesson_notes`, `daily_tasks`, `study_sessions`, `flashcard_decks`.

---

## Step 2 — Set environment variables (5 min)

In Vercel → Settings → Environment Variables, confirm the required ones from
`LAUNCH-CHECKLIST.md` §1 are set for **Production**. Add these if you want the optional
features:

- `DEEPSEEK_API_KEY` — turns on the **D-Maths A.I** helper.
- `NEXT_PUBLIC_SENTRY_DSN` — turns on error monitoring (Step 6).

**✅ Check:** no blanks in the Production column for the required rows.

---

## Step 3 — Promote to Production (3 min)

Vercel → **Deployments** → newest build → **⋯ → Promote to Production**
(or **Redeploy** if you just changed env vars).

**✅ Check:** open `<HOST>` on your phone — the landing page loads, and signing in reaches
the portal. **Nothing built in the last sessions is live until this step is done.**

---

## Step 4 — Wire the 5 cron jobs (15 min)

> **⚠️ The host matters.** `dmaths.academy` **308-redirects** to its canonical domain and
> cron-job.org does **not** follow redirects — jobs pointed there fail and get auto-disabled.
> Test first: open `<HOST>/api/reminders/nudges` in a browser. You want
> `{"error":"Unauthorized"}` (correct — no key). If the address bar **changes**, that host
> redirects: use `https://dmaths.vercel.app` instead, or switch on **"Follow redirects"** in
> each job's advanced settings.

On cron-job.org create/repair these. Every URL ends with `?key=<CRON_SECRET>`:

| Job | Schedule | URL |
|---|---|---|
| Class reminders | every 15 min | `<HOST>/api/reminders/classes?key=…` |
| Scheduled broadcasts | every 5–15 min | `<HOST>/api/cron/broadcasts?key=…` |
| Engagement nudges | **daily** (evening WAT) | `<HOST>/api/reminders/nudges?key=…` |
| Subscription reminders | daily | `<HOST>/api/reminders/subscriptions?key=…` |
| Assignment reminders | daily | `<HOST>/api/reminders/assignments?key=…` |
| Guardian digest *(optional)* | weekly | `<HOST>/api/reminders/guardian-digest?key=…` |

> **⚠️ Check every job's schedule.** cron-job.org defaults to **every minute**. That's fine for
> nothing here — set **nudges, subscriptions, assignments and the guardian digest to once daily
> or less**, class reminders to ~15 min, broadcasts to 5–15 min. (Nudges, assignment reminders
> and the guardian digest now all refuse to contact the same person twice in a day even if they
> *are* called too often — but the schedule should still be right.)

**✅ Check:** hit **Test run** on each — you want **200**. A **308** = wrong host (see the
warning). A **401** = the `key` doesn't match `CRON_SECRET` exactly. A **503** on the assignment
or guardian job = `migration-email-log.sql` hasn't been run (Step 1) — those two refuse to send
without their duplicate guard. Re-enable any job cron-job.org previously auto-disabled.

**Then open `<HOST>/admin/health`.** Every job you just wired should be **green**; anything
still amber ("Never run") has not reached the server, so its URL or key is wrong. Come back to
this page any time — it is the one place that tells you a scheduled job has quietly died.

---

## Step 5 — Make "Forgot password" work (10 min)

Three Supabase settings, no code — full detail in `LAUNCH-CHECKLIST.md` §6:

1. **Authentication → URL Configuration** — Site URL = your live address; add
   `<HOST>/**` to Redirect URLs.
2. **Authentication → Emails → Reset Password** — set the link to
   `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/reset-password`
3. **SMTP** (strongly recommended) — connect Resend/Brevo; Supabase's built-in mail is
   rate-limited and lands in spam.

**✅ Check:** `/login` → "Forgot password?" → the email arrives → the link sets a new
password. Until this works, a locked-out student is stuck.

---

## Step 6 — Safety nets (10 min)

- **Error monitoring:** create a free Sentry project → paste the DSN into
  `NEXT_PUBLIC_SENTRY_DSN` → **Redeploy**. (§7)
- **Nightly backups:** GitHub → Settings → Secrets → Actions → add `SUPABASE_DB_URL`
  (Supabase → Database → Connection string). (§8)
- **Admin 2FA:** sign in as admin → **/admin/security** → enrol with your authenticator.

**✅ Check:** Sentry shows your project as "waiting for events" (or receives one);
GitHub → **Actions → Database backup** can be run manually and goes green.

---

## Step 7 — Smoke test the real thing (15 min)

On your phone, as a **real student account**:

1. **Install** — landing page → "Get the app" → install → it opens standalone (and the
   button disappears afterwards).
2. **Notifications** — Portal → Profile → **Turn on notifications** → Allow.
3. **Task of the day** — from Admin, post one to that student → they get a **push**, and
   the task **pops up** in their portal; "Mark as done" clears it.
4. **Class** — create a class → it appears in *My classes* with **Add to calendar**.
5. **Revision cards** — publish a deck with 2 cards → the student sees "2 due" and can
   grade them.
6. **Focus mode** — run a 15-minute timer (or "End & save") → minutes appear, heatmap fills.
7. **Payment** — if taking real money, switch Paystack to **live** keys and set the webhook
   to `<HOST>/api/paystack/webhook`.

**✅ Check:** every step above behaved. Anything that didn't → note the exact error text.

---

## If something breaks

| Symptom | Cause | Fix |
|---|---|---|
| Cron shows **308** | Host redirects | Use the non-redirecting host (Step 4) |
| Cron shows **401** | `key` ≠ `CRON_SECRET` | Re-copy the secret from Vercel |
| "run migration-… .sql" message | That migration hasn't run | Run it (Step 1) |
| "Bucket not found" on upload | Storage buckets missing | Run `storage-buckets.sql` |
| New feature missing entirely | Not promoted | Promote to Production (Step 3) |
| Push never arrives | `migration-push.sql` / permission | Run it; re-allow notifications |
| Two-factor error on an API | Admin session at aal1 | Sign in again and complete 2FA |

---

## Day 2 and beyond

- **Check Admin → System health** — one page tells you whether every scheduled job is still
  running, which migrations are outstanding, and which reminder emails actually went out.
- **Watch Sentry** for the first week — real users surface things testing never does.
- **Admin → Students to watch** flags learners slipping early.
- **Google Play** — the TWA is store-ready; follow `docs/play-store-twa.md` when you want it.
