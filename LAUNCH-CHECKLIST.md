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
13. `migration-schema-fixes.sql` *(run last — patches any missing columns)*

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
