# D-Maths — Security Audit

_Full review of the app's attack surface. Overall posture: **strong.** Findings below
were fixed in this pass; accepted risks are documented with rationale._

## Method
Reviewed every API route (`app/api/**`), auth & route protection (`middleware.ts`,
`lib/auth.ts`, `lib/authRole.ts`), the service-role client, RLS policies
(`supabase/*.sql`), payment/webhook verification, file uploads, secrets handling,
and every `dangerouslySetInnerHTML` usage.

## What's already solid
- **Every API route is guarded.** A scan for auth guards found exactly one route
  without a session/role/secret check — `/api/applications/submit` — which is the
  intentional public enrolment form, and it is rate-limited, field-whitelisted, and
  the DB trigger forces `payment_verified = false` on insert.
- **Authorization is centralised** (`requireStaff`, `staffCanAccessStudent`,
  `staffCanAccessClass`, `getRoster`) and tutor actions are scoped to their roster.
  Per-learner routes verify ownership (`.eq("student_id", user.id)`).
- **Payments can't be spoofed.** The Paystack webhook verifies an HMAC-SHA512
  signature of the raw body in constant time; `/paystack/verify` re-checks with the
  secret key, enforces currency + minimum amount, and cross-checks the payer email.
  `payment_verified` is only ever set by the service role after these checks.
- **RLS everywhere**, with `is_admin()` / `is_staff()` helpers; the service-role key
  is server-only (`lib/supabase/admin.ts`) and never imported client-side.
- **Uploads** are authenticated, rate-limited, size-capped, extension- and
  bucket-allowlisted, with sanitised paths (no traversal) and server-generated names.
- **Cron/reminder endpoints** require `CRON_SECRET` (bearer or `?key=`) or an admin
  session.
- **Secrets** live only in env (repo ships placeholders); `.env.example` documents them.
- **All `dangerouslySetInnerHTML`** is safe: the code highlighters HTML-escape first,
  Math Lab uses KaTeX, the notebook markdown renderer escapes before formatting, and
  the JSON-LD block is fully static.
- **Security headers**: strict CSP, `X-Frame-Options: DENY`, `frame-ancestors 'none'`,
  HSTS, `X-Content-Type-Options: nosniff`, scoped `Permissions-Policy`; authenticated
  pages set `no-store`.

## Fixed in this pass
1. **AI assistant had no rate limit** → a signed-in account (or stolen session) could
   hammer the paid DeepSeek endpoint (cost-abuse / DoS). Added a **per-user** limit
   (20/min) on `/api/assistant` and 6/min on `/api/assistant/health`.
2. **Shared-notebook publishing was bypassable.** `/api/notebooks/share` is staff-only,
   but the owner-write RLS policy would let a learner set `shared = true` directly from
   the browser. Added a DB trigger (`migration-notebook-share-guard.sql`) that forces
   `shared = false` unless the row's owner is staff — enforced regardless of code path.
3. **Parent portal wasn't in the middleware matcher.** It was already guarded by its
   layout, but is now also protected at the edge (unauth redirect + `no-store`) for
   parity with `/portal`, `/admin`, `/tutor`.

## Accepted risks (documented, not changed)
- **CSP `script-src` allows `'unsafe-inline'` and `'unsafe-eval'`.** `unsafe-inline` is
  required by Next.js hydration without a nonce pipeline; `unsafe-eval` is required by
  Pyodide (in-browser Python/WASM). Mitigated by strict `frame-ancestors`, no untrusted
  script origins, and escaped HTML sinks.
- **Rate limiting is per-instance in-memory** (`lib/ratelimit.ts`). Stops naive abuse at
  zero cost; a distributed attacker across warm instances isn't fully bounded. Upgrade to
  Upstash Redis if abuse is ever observed.
- **Notebook rich output renders `_repr_html_`** (e.g. pandas tables) via
  `dangerouslySetInnerHTML`. This is the user's **own** code output in their **own**
  browser — self-XSS only; outputs are never persisted or shared between users (only cell
  source is shared, and it is re-run by the reader).
- **IP-based rate-limit keys** trust `x-forwarded-for`. Authenticated routes that matter
  (assistant) key on the user id instead; the public/upload keys remain best-effort.

## Admin two-factor auth (TOTP) — added
Admins can enable **TOTP 2FA** (Supabase MFA) under **Admin → Security**. After
password sign-in, an enrolled admin must enter the 6-digit code to reach `aal2`;
the login flow and the `/admin` layout both refuse to load admin pages while the
session is only `aal1`, so a stolen password alone can't reach the dashboard.

**API routes are enforced too.** `middleware.ts` gates **every `/api/*` request**: a
session with a verified factor that is still `aal1` gets a `403` (and matched pages
redirect to the code screen). The check is a local cookie-JWT decode — no network —
and can't be spoofed (an attacker with the password holds a real `aal1` token, and
can't forge `aal2` without Supabase's signing key; the route's own `getUser` rejects
forgeries anyway). Requests with no session (public form, Paystack webhook, cron)
pass straight through to each route's own auth. So a stolen admin password can reach
neither the dashboard **nor** the admin APIs.

## Recommended next steps (optional)
- Move rate limiting to Upstash Redis for global enforcement.
- Periodically run `npm audit` and Supabase's `get_advisors` (RLS/security linters).
