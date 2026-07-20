# Kulworks — Architecture & System Map

A complete reference for how this site is built: every page, route, integration, env
var, data model, and script — and where to look when something breaks. Keep this
updated as the system changes.

- **Framework:** Next.js 16 (App Router) — a **server app** (NOT static export).
- **Hosting:** Vercel. GitHub repo `github.com/skulbeth/kulworks` → push to **`main`**
  auto-deploys **production**. Branches get preview deploys.
- **Language:** TypeScript. **Styling:** Tailwind. **DB access:** Prisma.
- **Gate:** `constructionMode` in `src/data/site.ts` — while `true`, the public sees the
  coming-soon page (`ComingSoon`) and the whole site is `noindex`. Inner pages (incl.
  `/contact`) are still reachable directly.

---

## 1. Public site pages (`src/app/`)

| Route | File | What it is |
|---|---|---|
| `/` | `page.tsx` | Home (shows `ComingSoon` while construction mode is on) |
| `/about` | `about/page.tsx` | About |
| `/services`, `/services/card-printing`, `/services/card-printing/[slug]` | `services/**` | Services + card-printing detail pages |
| `/pricing` | `pricing/page.tsx` | Pricing table (`data/pricing.ts`) + **CardCalculator** (estimate → prefills contact form) |
| `/portfolio` | `portfolio/page.tsx` | Portfolio grid |
| `/guides`, `/guides/[slug]` | `guides/**` | Guides / FAQ (`data/guides.ts`) |
| `/who-its-for` | `who-its-for/page.tsx` | Audience page |
| `/contact` | `contact/page.tsx` | **Quote form** (`components/ContactForm.tsx`) |
| `/privacy` | `privacy/page.tsx` | Privacy policy |
| `/terms` | `terms/page.tsx` | Terms of Service |
| (404) | `not-found.tsx` | Custom "page not found" |
| `/sitemap.xml`, `/robots.txt`, `/icon.svg` | `sitemap.ts`, `robots.ts`, `icon.svg` | SEO |

Marketing chrome (Header/Footer) is applied by `components/SiteFrame.tsx`, which also
mounts the analytics `PageTracker` — both are **skipped on `/admin`**.

---

## 2. Admin portal (`src/app/admin/`)

Login-gated (Supabase Auth). `src/proxy.ts` (edge middleware) redirects unauthenticated
`/admin/*` to the login page; `requireProfile()` (in `lib/auth.ts`) additionally enforces
per-admin **2FA** and blocks **deactivated** accounts. 30-min idle auto-logout (`IdleLogout`).

| Route | What it does |
|---|---|
| `/admin/login` | Sign in → optional **2FA step** (choose authenticator app OR emailed code) + "Forgot password?" |
| `/admin/reset` | Set a new password (after the reset/invite email link) |
| `/admin/logout` | Sign out (POST) — also clears the email-2FA cookie |
| `/admin` | **Dashboard** — stats, upcoming due dates, reminders, recent submissions |
| `/admin/submissions` | Raw quote requests; status change, convert→project, archive; shows phone + Drive link + visit journey |
| `/admin/projects`, `/admin/projects/[id]` | Projects (BPM): stage/specs/costs/dates, payments, activity, reminders, **manual "Send progress update"** + one-click **"Notify client: project started"**, archive |
| `/admin/clients`, `/admin/clients/[id]` | Clients (CRM): contact/address, projects, activity, **"Send an email"** composer (+ optional Drive folder) |
| `/admin/subscribers` | Newsletter list (+ CSV export) |
| `/admin/newsletter` | Compose + send a Resend Broadcast to subscribers |
| `/admin/analytics` | Page-view analytics (totals, trend, top pages/referrers, devices, recent) |
| `/admin/team` | **Add a team member** (set a password OR email an invite — one form), edit/reset/deactivate/reactivate (owner only), **change my password**, **two-factor auth** (app or emailed code), **audit log**, **backups**, **system errors** |
| `/admin/archive` | Soft-deleted items + **Restore** |

All admin data mutations live in `src/app/admin/(portal)/_actions.ts` (Next server
actions — each re-checks auth via `requireProfile()` and writes an audit-log entry for
the important ones).

---

## 3. API routes (`src/app/api/`)

| Route | Method | Purpose | Protection |
|---|---|---|---|
| `/api/quote` | POST | Save quote submission → notify Sam + confirm customer + SMS ping + optional Drive folder | rate limit, honeypot, Turnstile, 60s dup guard |
| `/api/subscribe` | POST | Newsletter signup → Subscriber + Resend Audience | rate limit, honeypot, Turnstile |
| `/api/track` | POST | Cookieless page-view beacon | rate limit, bot-UA filter |
| `/api/cron/reminders` | GET | Daily digest of due/overdue reminders → email Sam | `CRON_SECRET` bearer |
| `/api/cron/backup` | GET | Weekly full JSON backup → email attachment | `CRON_SECRET` bearer |
| `/api/admin/backup` | GET | On-demand JSON backup download | logged-in session |
| `/auth/callback` | GET | Exchange OAuth code → session (password reset / team invite) | — |

---

## 4. Data models (`prisma/schema.prisma`)

| Model | Purpose |
|---|---|
| `Profile` | Admin users (id = Supabase auth id) + role (OWNER/STAFF), `phone`, `deactivatedAt` (soft-off), `twoFactorEnabled` |
| `Client` | CRM contact (name, email, phone, company, address, notes) |
| `Submission` | Raw quote request (+ phone, sessionId, driveFolderUrl, status) |
| `Project` | Tracked job — pipeline stage, specs, costs, dates, shipping; `dueEventId`/`deliveryEventId` (Google Calendar) |
| `Payment` | Itemized payments per project (amount + method) |
| `Activity` | Timeline: notes, emails-sent, calls, status changes, reminders (`remindAt`, `done`, `calendarEventId`) |
| `Subscriber` | Newsletter list (+ `resendContactId`) |
| `PageView` | Analytics (path, referrer, geo, device, sessionId) |
| `RateLimit` | Sliding-window rate-limit hits |
| `AuditLog` | Who did what in admin |
| `ErrorLog` | Captured server errors |
| `TwoFactorCode` | Hashed one-time email-2FA codes (expiry + attempt cap) |

Soft delete: `Submission`, `Project`, `Payment`, `Activity` have `deletedAt` — deletes
**archive** (hide, never destroy). All read queries filter `deletedAt: null`.
Migrations are versioned in `prisma/migrations/` (committed).

---

## 5. Integrations — what, where, env, key files

| Integration | Used for | Env vars | Key files |
|---|---|---|---|
| **Supabase** | Postgres DB + admin Auth | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, `DATABASE_URL`, `DIRECT_URL` | `lib/prisma.ts`, `lib/supabase/{client,server,middleware,admin}.ts`, `lib/auth.ts` |
| **Two-factor auth** | Admin 2FA — authenticator app (Supabase MFA/TOTP) or emailed 6-digit code (via Resend); signed session cookie | *(no new env — cookie signed with `SUPABASE_SECRET_KEY`)* | `lib/two-factor.ts`, `admin/login/_actions.ts`, `_components/TwoFactorSetup.tsx` |
| **Resend** | All email (notifications, confirmations, reminders, backups, newsletter, admin sends) from `contact@kulworks.com` | `RESEND_API_KEY`, `RESEND_FROM`, `QUOTE_NOTIFY_EMAIL`, `RESEND_AUDIENCE_ID` | `lib/email.ts` |
| **Cloudflare Turnstile** | Bot protection on public forms | `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY` | `lib/turnstile.ts`, `components/TurnstileWidget.tsx` |
| **Google Drive** | Auto-create shared artwork folders | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN`, `GOOGLE_DRIVE_PARENT_FOLDER_ID` | `lib/google-oauth.ts` (shared token), `lib/google-drive.ts`, `scripts/google-auth.mjs` |
| **Google Calendar** | Push project due/delivery dates + reminders (incl. auto 3-day-before) onto a dedicated **Kulworks** calendar as all-day events (one-way, app→calendar; best-effort — never blocks a save) | `GOOGLE_CALENDAR_ID` (+ shared Google OAuth vars above; refresh token needs the Calendar scope) | `lib/google-calendar.ts`, `lib/google-oauth.ts`, `scripts/google-calendar-setup.mjs`, `scripts/calendar-backfill.mjs`, wired in `admin/(portal)/_actions.ts` |
| **Vercel Cron** | Scheduled reminders + backup | `CRON_SECRET` | `vercel.json` |
| **Carrier SMS gateway** | Free "new lead" text ping | `NOTIFY_SMS` (e.g. `210…@vtext.com`) | in `/api/quote` |
| **Squarespace** | Domain registrar + **DNS host** (all records: MX, SPF, DKIM, DMARC, Vercel) | — | (external — Squarespace dashboard) |
| **Mailgun + OnDMARC** | **Inbound email** (MX → `mx*.mailgun.org`), root SPF (`include:mailgun.org`), and the live **DMARC** record (`p=none`, reports → Mailgun/OnDMARC). NOTE: this is the real inbound path — NOT Squarespace's built-in email forwarding. Confirm account access. | — | (external — Mailgun / OnDMARC dashboards) |
| **Vercel** | Hosting + prod env vars | (all of the above) | `vercel.json`, `next.config.mjs` |
| **Gmail "Send as"** | Sam replies as `contact@kulworks.com` (via Resend SMTP) | — | (external — Gmail settings) |

**External accounts** (all under `kulworksdesign@gmail.com`): Supabase (project
`KulworksWebsite`), Resend, Cloudflare (Turnstile), Google Cloud (Drive OAuth app,
Testing mode), Vercel, Squarespace (domain).

---

## 6. Cron jobs (`vercel.json`) — production only

| Path | Schedule | Does |
|---|---|---|
| `/api/cron/reminders` | daily 13:00 UTC | Emails Sam reminders due today/overdue. Also keeps the Supabase free tier awake (daily DB touch). |
| `/api/cron/backup` | Mondays 14:00 UTC | Emails Sam a full JSON backup attachment. |

---

## 7. Dev/utility scripts (`scripts/`, run via `npm run …`)

| Command | Does |
|---|---|
| `npm run db:migrate` / `db:generate` / `db:studio` / `db:push` | Prisma (studio = visual DB browser) |
| `npm run db:seed` / `db:seed -- --clean` | Add / remove demo data |
| `npm run db:verify` | DB connection check |
| `npm run admin:create -- <email> <pw> ["Name"]` | Create/update an admin login |
| `npm run admin:check -- <email> <pw>` | Test a login |
| `npm run google:auth` | One-time Google authorize (Drive + Calendar scopes) → refresh token |
| `npm run google:calendar` | Find-or-create the "Kulworks" calendar → prints `GOOGLE_CALENDAR_ID` |
| `npm run calendar:backfill` | Push existing projects' dates + open reminders onto the calendar (safe to re-run) |
| `npm run email:test` | Send a test email |
| `node scripts/smoke-test.mjs` (dev server up) | Full smoke suite (21+ checks) |
| other `scripts/verify-*.mjs`, `test-drive`, `resend-setup`, `db-inspect`, `cleanup-live-test`, `check-real-visits` | One-off verifications |

---

## 8. "If X breaks, check Y"

- **Site down / build failing** → Vercel → Deployments → open the failed build log.
- **Quote form errors / no submissions saving** → check Supabase env vars in Vercel; check `/admin` → Team → System errors; confirm Supabase project isn't paused.
- **No emails arriving** → *Outbound* (quotes/confirmations/newsletter) is **Resend** → Resend dashboard (Logs), verify `RESEND_*` env vars + `kulworks.com` still verified (DKIM `resend._domainkey`). *Inbound* (mail sent TO @kulworks.com) is **Mailgun** (MX) → check the Mailgun dashboard/routes. DMARC (`_dmarc`, `p=none`) reports go to Mailgun/OnDMARC — do not add a second `_dmarc` record.
- **Bot challenge blocking real users** → Turnstile keys in Vercel; Cloudflare Turnstile dashboard.
- **Drive folders not creating** → `GOOGLE_*` env vars; Google Cloud OAuth app still in Testing with Sam as test user; refresh token may need re-issuing (`npm run google:auth`).
- **Calendar events not appearing** → `GOOGLE_CALENDAR_ID` set in Vercel? Refresh token must include the Calendar scope — if it predates the scope add, re-run `npm run google:auth` and update `GOOGLE_REFRESH_TOKEN`. Sync is best-effort: check server logs (`[calendar] …`) / Team → System errors. Events only sync for dates/reminders saved *after* setup — run `npm run calendar:backfill` for existing ones.
- **No reminder/backup emails** → `CRON_SECRET` in Vercel; Vercel → Cron tab (Hobby plan cron limits).
- **No SMS ping** → `NOTIFY_SMS` in Vercel; carrier gateways are best-effort.
- **Locked out of admin** → use "Forgot password?" on the login page, or `npm run admin:create` to reset. **2FA lockout:** Supabase dashboard → Authentication → the user → remove the MFA factor, and/or set that `Profile.twoFactorEnabled = false` (re-enables password-only login).
- **Data recovery** → soft-deleted items are in `/admin/archive`; full data in the weekly backup email or `/admin/backup`.

---

## 9. Resume on any machine

See `TODO.md` → "Resume here". Short version: `git clone`, `npm install`, then pull the
secrets from Vercel (the secure way — no copying secret files around):
`vercel login && vercel link && vercel env pull .env.local --environment=production`
(or copy `.env.example` → `.env.local` and fill by hand). Then `npm run dev`.
Everything else (DB, email, Drive) is cloud-hosted + env-driven, so a second machine
picks up the same live data automatically. **Do NOT** email/Drive/commit `.env.local` —
it's gitignored for a reason; `vercel env pull` is the intended way to sync secrets.
