# 🚀 D-Maths — Go-Live Checklist

A plain-English guide to everything needed to run the D-Maths portal. **You can do all
of this yourself, for free, without any developer or AI subscription** — every code
change is done in the GitHub web editor (pencil ✏️ icon → *Commit changes*) and Vercel
redeploys automatically in ~1 minute.

> **Golden rule:** whenever you change an **environment variable** in Vercel, you must
> **Redeploy** (Deployments → ⋯ → Redeploy) before it takes effect.

---

## ✅ Already built & live
- Student / parent / admin portals, enrolment + approval flow
- Summer Camp landing page, packages, part-payment, editable dates
- Paystack payments + signed webhook, payment ledger, receipts
- Email (credentials, camp welcome, receipt, balance reminder, reports…)
- Audit log, behaviour/rewards/badges, parent portal
- **Installable app (PWA)** + offline page
- **Push notifications** engine + **class reminders** (cron-job.org)
- Branded animations, Help/FAQ, legal pages

---

## 1) Environment variables (Vercel → Settings → Environment Variables)

Set these for **Production, Preview, Development**. 🔓 = safe to expose · 🔒 = keep secret.

| Variable | Secret? | What it is |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | 🔓 | Supabase → Project Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 🔓 | Supabase → API → `anon` public key |
| `SUPABASE_SERVICE_ROLE_KEY` | 🔒 | Supabase → API → `service_role` key (admin actions) |
| `NEXT_PUBLIC_SITE_URL` | 🔓 | Your live address, e.g. `https://dmaths.vercel.app` (no trailing slash) |
| `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` | 🔓 | Paystack → Settings → API Keys → Public key |
| `PAYSTACK_SECRET_KEY` | 🔒 | Paystack → API Keys → Secret key |
| `EMAIL_RELAY_URL` | 🔓 | Your Apps Script web-app URL (the email relay) |
| `EMAIL_RELAY_SECRET` | 🔒 | The secret string inside the Apps Script `EmailService.gs` |
| `VAPID_PUBLIC_KEY` | 🔓 | Web-push public key |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | 🔓 | **Same value** as `VAPID_PUBLIC_KEY` (browser copy) |
| `VAPID_PRIVATE_KEY` | 🔒 | Web-push private key |
| `VAPID_SUBJECT` | 🔓 | `mailto:dmathstuition@gmail.com` |
| `CRON_SECRET` | 🔒 | Random string protecting the cron endpoints |
| `DEEPSEEK_API_KEY` | 🔒 | *(optional)* Powers the "D-Maths A.I" hint chat via DeepSeek (platform.deepseek.com + billing). Leave unset and the widget shows a friendly "not switched on yet" message. |
| `DEEPSEEK_MODEL` | 🔓 | *(optional)* Chat model — defaults to `deepseek-chat` (use `deepseek-reasoner` for heavier reasoning). |
| `NEXT_PUBLIC_SENTRY_DSN` | 🔓 | *(optional)* Sentry project DSN — turns on error monitoring (see section **7**). Leave unset to keep Sentry fully off. |
| `SENTRY_AUTH_TOKEN` | 🔒 | *(optional)* Only for readable stack traces (source-map upload) at build time |
| `SENTRY_ORG` | 🔓 | *(optional)* Sentry org slug — pairs with `SENTRY_AUTH_TOKEN` |
| `SENTRY_PROJECT` | 🔓 | *(optional)* Sentry project slug — pairs with `SENTRY_AUTH_TOKEN` |

> To regenerate keys later: VAPID → `npx web-push generate-vapid-keys`; `CRON_SECRET` →
> any long random string. After changing either, redeploy and update the matching place
> (the cron-job.org URL for `CRON_SECRET`; nothing else for VAPID).

---

## 2) Database migrations (Supabase → SQL Editor → New query)

Open each file under `supabase/`, copy its contents into the SQL Editor, and **Run**.
They are **idempotent** — safe to run again if you're unsure whether one was applied.
Run in this order (skip `schema.sql` if the project already has data):

1. `schema.sql` *(base — only on a brand-new project)*
2. `migration-v2.sql`
3. `migration-summer-camp.sql`
4. `migration-paystack-security.sql`
5. `migration-part-payment.sql`
6. `migration-gamification.sql`
7. `migration-behaviors.sql`
8. `migration-parent-portal.sql`
9. `migration-guardian-email.sql`
10. `migration-notifications.sql`
11. `migration-audit-extras.sql`
12. **`migration-push.sql`**  ← needed for push notifications to remember devices
13. `migration-messages.sql` *(admin ↔ learner direct messages)*
14. `migration-streaks.sql` *(learning streaks)*
15. `migration-weekly-digest.sql` *(weekly progress digest)*
16. `migration-referrals-ratings.sql` *(referral links + in-app ratings)*
17. `migration-class-series.sql` *(weekly recurring classes)*
18. `migration-class-recordings.sql` *(rewatchable class recordings)*
19. `migration-assignment-deadline.sql` *(assignment deadline time)*
20. `migration-subscriptions.sql` *(monthly subscriptions + payment reminders)*
21. `migration-voice-messages.sql` *(voice notes in chat)*
22. `migration-tutor-portal.sql` *(tutor role, class assignment, tutor roster + read-only RLS)*
23. `migration-tutor-messages.sql` *(learner↔tutor direct message threads)*
24. `migration-code-snippets.sql` *(saved Python playground snippets)*
25. `migration-code-assignments.sql` *(coding assignments — Python/Web in the IDE)*
26. `migration-shared-notebooks.sql` *(tutors/admin share starter notebooks with learners)*
27. `migration-live-classes.sql` *(in-portal live classes — "LIVE now" state)*
28. `migration-schema-fixes.sql` *(run last — patches any missing columns)*

> **⚠️ Also run `storage-buckets.sql` once** — it creates the file-storage buckets
> (materials, curricula, assignments, submissions, voice-notes). Without it, uploading
> an assignment photo / material fails with **"Bucket not found"**.

---

## 3) Remaining activation steps

- [ ] **Run `migration-push.sql`** (step 2 above) — without it, push can't store devices.
- [ ] **Turn on & test push:** open the installed app → tap **Enable** on the
      "Turn on notifications" prompt → then give a reward or approve a test application →
      confirm a notification pops up on the device.
- [ ] **Redeploy the Apps Script email app** so the newer emails send
      (**receipt**, **camp welcome**, **balance reminder**): Apps Script editor →
      **Deploy → Manage deployments → Edit → New version → Deploy**. (Keep the same
      web-app URL so `EMAIL_RELAY_URL` stays valid.)
- [ ] **Class reminders (cron-job.org)** — ✅ DONE. The job calls
      `https://dmaths.vercel.app/api/reminders/classes?key=<CRON_SECRET>` every 15 min.
- [ ] **Subscription payment reminders (cron-job.org):** add a **daily** job calling
      `https://dmaths.academy/api/reminders/subscriptions?key=<CRON_SECRET>` — nudges
      monthly subscribers (and their parents) from 3 days before their due date, then
      weekly while overdue. Requires `migration-subscriptions.sql`.
- [ ] **Paystack go-live** (when taking real money): switch to **live** API keys in
      Vercel, and in Paystack → Settings → **Webhooks** set the URL to
      `https://dmaths.vercel.app/api/paystack/webhook`. Enable 2FA + set a settlement bank.
- [ ] **Make "Forgot password?" work** — the code is already built; it just needs 3
      Supabase settings (see the dedicated section **6** below).
- [ ] *(Optional)* Re-upload sharper `public/camp-hero.png` & `public/camp-about.png`
      (≥1200px wide, same filenames) for a crisper homepage.

---

## 4) Handy operations (no developer needed)

- **Change the Summer Camp dates:** edit `lib/summerCamp.ts` → the two
  `startDate` / `endDate` lines → commit. Every date on the site updates automatically.
- **Completely delete a learner:** run `supabase/delete-learner.sql` in the SQL Editor
  (edit the Student ID / email at the top first). ⚠️ Permanent. (The admin portal's
  "Danger zone → Permanently delete" does the same thing through the UI.)
- **Discounts/prices:** edit `DISCOUNT_PCT` and the tier prices in `lib/summerCamp.ts`.
- **Refer a friend:** every student has a referral link — `…/apply?ref=<their Student ID>`
  (they'll find a **Refer a friend** page in their portal). When a referred applicant is
  approved, the referrer is credited and notified. See who referred whom on each student's
  admin detail page.
- **Read student/parent feedback:** star ratings + comments appear under
  **Admin → Feedback** (`/admin/ratings`), with a running average.
- **Manual payments:** approving an application with a transfer/Opay/cash payment now
  records it in **Admin → Payments** automatically; use **+ Record manual payment** there
  for balances or money outside an application. Run `supabase/backfill-manual-payments.sql`
  **once** to pull in learners approved before this existed.

---

## 5) How to edit anything without Claude

1. Open the file on **GitHub** (e.g. `lib/summerCamp.ts`).
2. Click the **pencil ✏️** (Edit) icon.
3. Make your change → **Commit changes**.
4. **Vercel redeploys automatically** in about a minute. Done.

For environment variables, edit them in **Vercel → Settings → Environment Variables**,
then **Redeploy**.

---

## 6) Make "Forgot password?" work (Supabase settings — no code)

The reset flow is fully built in the app (`/auth/confirm` + `/reset-password`). It only
needs three Supabase settings:

1. **Authentication → URL Configuration**
   - **Site URL:** `https://dmaths.academy`
   - **Redirect URLs:** add `https://dmaths.academy/**` (and `http://localhost:3000/**`
     for local testing).
2. **Authentication → Emails → "Reset Password" template** — set the link/button href to
   exactly:
   ```
   {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/reset-password
   ```
   (The default template uses a different flow, which is why resets don't currently work.)
3. **Authentication → Emails → SMTP (strongly recommended):** configure custom SMTP with a
   free service like **Resend** or **Brevo**. Supabase's built-in mail is rate-limited to a
   few messages/hour and often lands in spam, so resets are unreliable without it.

**Test:** `/login` → "Forgot password?" → enter your email → open the emailed link → set a
new password → you're returned to sign in. If the link says "invalid or expired", re-check
steps 1–2 (usually the email-template href).

---

## 7) Error monitoring (Sentry) — optional but recommended

So you hear about a crash before a parent has to tell you. It's **free** and takes ~2 min.
The app ships **fully off** — it does nothing at all until you add a DSN.

1. Create a free account at **sentry.io** → **Create project** → platform **Next.js**.
2. Copy the project's **DSN** (a URL like `https://abc123@o0.ingest.sentry.io/456`).
3. In **Vercel → Settings → Environment Variables**, add
   `NEXT_PUBLIC_SENTRY_DSN` = that DSN (Production, Preview, Development), then **Redeploy**.
4. That's it — errors now appear in your Sentry dashboard with a stack trace.

> *(Optional, for nicer stack traces)* add `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, and
> `SENTRY_PROJECT` (from Sentry → Settings) so build-time source maps are uploaded.
> Skipping these is completely fine — errors are still captured either way.

**To turn it off:** delete `NEXT_PUBLIC_SENTRY_DSN` and redeploy. No code change needed.

---

## 8) Nightly database backups (GitHub Actions) — optional but recommended

An independent, downloadable copy of the database, on top of Supabase's own backups. Runs
automatically every night and keeps each backup for **30 days**. Add **one secret** to
switch it on (until then the workflow runs green but does nothing):

1. In **Supabase → Project Settings → Database → Connection string**, copy the
   **URI** (the `postgresql://…` one; the *Session pooler* or *Direct connection* both work).
2. In **GitHub → your repo → Settings → Secrets and variables → Actions → New repository
   secret**, add:
   - **Name:** `SUPABASE_DB_URL`
   - **Value:** the connection string from step 1 (it contains the DB password — keep it secret).
3. Done. The **Database backup** workflow runs nightly.

**To fetch a backup:** GitHub → **Actions** tab → **Database backup** → open the latest run →
download the **`db-backup-…`** artifact (a `.sql.gz`).
**To run one now:** Actions → **Database backup** → **Run workflow**.
**To restore:** `gunzip -c dmaths-backup-*.sql.gz | psql "<your SUPABASE_DB_URL>"`.

---

## 9) Publish to Google Play (the app is already store-ready as a PWA/TWA)

The Play app is a thin wrapper (**Trusted Web Activity**) around `https://dmaths.academy` —
so every Vercel deploy updates the "app" instantly with **no store re-submission**.

1. **Developer account** — play.google.com/console, one-time **$25**, identity
   verification (can take days). ⚠️ New *personal* accounts must run a **closed test
   with ≥12 testers for 14 days** before production; organisation accounts skip this.
2. **Package the PWA** — use **PWABuilder.com** → enter `https://dmaths.academy` →
   download the Android package (`.aab`) + note the package id (e.g. `academy.dmaths.twa`)
   and signing details.
3. **Upload to Play Console** → create the app → upload the `.aab` to a testing track.
4. **Digital Asset Links** (removes the browser bar): Play Console → **Setup → App
   signing** → copy the **SHA-256 certificate fingerprint**. In **Vercel → Environment
   Variables** set:
   - `ANDROID_PACKAGE_NAME` = your package id
   - `ANDROID_CERT_SHA256` = the fingerprint (comma-separate to also allow your upload key)
   Redeploy, then check `https://dmaths.academy/.well-known/assetlinks.json` shows it.
5. **Store listing** — name (≤30 chars), short description (≤80), full description,
   the 512×512 icon (already in `public/icons/icon-512.png`), a **1024×500 feature
   graphic**, and **2–8 phone screenshots** (take them from the installed app).
6. **Play forms**:
   - **Privacy policy URL:** `https://dmaths.academy/privacy`
   - **Account deletion URL** (required): `https://dmaths.academy/delete-account`
     (self-service deletion is built into the portals: Profile → *Delete my account*).
   - **Data safety:** declare name, email, phone, academic records; GA4 analytics.
   - **Content rating** questionnaire (education).
   - **Target audience:** most tutoring apps declare **13+** and "not primarily
     child-directed" (parents manage younger learners) — declaring under-13 triggers
     Google's stricter Families policies.
   - **App access:** provide a demo student login for the reviewers.
7. **Payments** — no change needed: tutoring is a *real-world service*, which is exempt
   from Google Play Billing, so Paystack stays as-is.
8. Roll out: closed testing → (14 days / 12 testers if required) → **Production**.
