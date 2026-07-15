# Kulworks — To-Do

Working list for launch + the custom backend build. Grouped by theme, not strict order.
For how the whole system fits together, see **[ARCHITECTURE.md](ARCHITECTURE.md)**.

---

## ▶️ Resume here (pick up on any machine / next session)

**Status:** Full custom backend is **built and shipped to production**, running behind the
coming-soon gate (`constructionMode: true`). See the ✅ items below for everything done.

**Roadmap order (Sam, 2026-07-03):** (1) 2FA method choice app-or-email ✅ SHIPPED →
(2) #10 Quotes & Invoices (Venmo + PayPal) ✅ SHIPPED → (3) Newsletter v2 →
(4) Google Calendar ✅ BUILT (needs one-time OAuth setup — see below) →
(5) **Real site content + photos** (copy, portfolio/service images) ← *next* → then flip
construction mode off to launch.

**Next up:** **Real site content + photos** (roadmap #5) — copy proofread, portfolio/service
images, address/socials in `site.ts`. Newsletter v2 (#11) remains available if preferred.

**⚠️ Google Calendar — one-time setup Sam must do (code is shipped):**
1. `npm run google:auth` → click Allow (now also grants the **Calendar** scope) → copy the
   printed `GOOGLE_REFRESH_TOKEN` into `.env.local` **and** Vercel (replaces the old one).
2. `npm run google:calendar` → creates the "Kulworks" calendar → copy the printed
   `GOOGLE_CALENDAR_ID` into `.env.local` **and** Vercel.
3. Redeploy. New/edited project dates + reminders now sync automatically. Run
   `npm run calendar:backfill` once to push the projects/reminders that already exist.

**To run locally on a fresh clone:**
1. `npm install`
2. **GET THE SECRETS.** ⬇️ If a new PC complains it's *"missing environment variables"* or
   *"can't find `.env.local`"* — THIS is the fix. `.env.local` is gitignored on purpose
   (it holds all the API keys/passwords), so it does NOT come with `git clone`. Do **NOT**
   copy it around by email/Drive/USB. Instead pull it straight from Vercel — run these
   four commands in the project folder, in order:
   ```
   npm i -g vercel
   vercel login
   vercel link                                    # choose the "kulworks" project
   vercel env pull .env.local --environment=production
   ```
   That creates `.env.local` with every real secret. (Fallback only if Vercel is
   unavailable: copy `.env.example` → `.env.local` and fill each value from the Vercel
   dashboard → Project → Settings → Environment Variables.)
3. `npm run dev` → http://localhost:3002  (admin: `/admin/login/`)

Everything (database, email, Drive) is cloud-hosted + env-driven, so a second machine
connects to the **same live data** automatically. Migrations are already applied (they're
in `prisma/migrations/`). Handy: `npm run db:studio` (browse DB), `npm run db:seed`,
`node scripts/smoke-test.mjs` (with dev server up).

**Deploy:** push to `main` → Vercel auto-deploys production. Keep `constructionMode: true`
until the real launch (then flip to `false` after content/socials/address are ready).

---

## 🚀 Launch blockers (before the site goes fully public)

These are empty placeholders in [src/data/site.ts](src/data/site.ts) and elsewhere that
should be filled with real info before launch:

- [ ] **Street address** — `site.ts:40` (only if you have a public storefront)
- [ ] **Postal code** — `site.ts:43`
- [ ] **Mailing address / PO box** — Sam doesn't have one yet. Required in marketing-email
      footers (CAN-SPAM) before sending real newsletters; get a PO box, then add to site data.
- [ ] **Social handles** — `site.ts:59`, still `REPLACE_WITH_HANDLE` placeholders
- [x] **2FA on admin login (authenticator app)** — BUILT + shipped (free, Supabase TOTP).
      Enroll on Team page, enforced 6-digit code at login, middleware enforces for enrolled
      users. No-factor accounts unaffected. **Recovery if locked out:** Supabase dashboard →
      Authentication → the user → remove the MFA factor (re-enables password-only login).
- [x] **2FA method choice: app OR emailed code** — SHIPPED. Per-admin master switch
      (`Profile.twoFactorEnabled`); at login the admin chooses authenticator app (Supabase
      TOTP) or a 6-digit code emailed via Resend. Email path is custom: `TwoFactorCode`
      (hashed + 10-min expiry + 5-try cap) + HMAC-signed `kw2fa` cookie (12h), enforced in
      `requireProfile`; cleared on logout/idle. FINAL: only email + app (no SMS — the free
      carrier email-to-SMS gateway is best-effort, unsafe for login codes). **Recovery if
      locked out:** Supabase dashboard → Auth → user → remove MFA factor, and/or set
      `Profile.twoFactorEnabled = false`.
- [x] **Admin phone field** — Profile.phone, required on create, editable; for records.
- [ ] **Construction-mode flag** — currently `false` (preview). Flip back to `true`
      before deploy so the public still sees the coming-soon page — UNLESS this push
      IS the real go-live.

## 🗄️ Custom backend build (the big project)

Goal: a custom database + password-protected admin dashboard, reachable from anywhere,
for tracking clients, querying data, and viewing analytics — all in one place.

- [x] **Pick the stack** — Supabase (all-in-one: Postgres + auth + file storage).
- [x] **Create Supabase project** — done (project "KulworksWebsite", region Canada Central).
- [x] **Supabase keys in local `.env.local` + Vercel** — done both sides.
- [x] **Free daily keep-alive** — covered: the daily reminders cron queries the DB every
      run, which resets Supabase's inactivity timer (no separate ping needed).
- [x] **Database schema** — Prisma models live in Supabase: Submission, Client, Profile
      (team/roles), Subscriber, PageView. Migration applied + connection verified.
- [x] **Client helpers** — Prisma singleton + Supabase browser/server auth clients.
- [x] **Wire the quote form to the DB** — `/api/quote` route saves submissions (upserts
      Client, creates Submission); form posts to it; honeypot + validation added; verified
      end-to-end. NOTE: this required switching next.config off static-export (`output:
      "export"`) to a server app — so the site must now deploy on Vercel (a server host),
      not a pure static host.
- [x] **Supabase env vars in Vercel** — 5 added (URL, PUBLISHABLE_KEY, SECRET_KEY,
      DATABASE_URL, DIRECT_URL).
- [x] **Email/cron env vars in Vercel** — all 5 added (RESEND_API_KEY, RESEND_FROM,
      QUOTE_NOTIFY_EMAIL, RESEND_AUDIENCE_ID, CRON_SECRET). All 10 env vars now in Vercel.
- [x] **Email notifications (Resend)** — DONE + verified. On submit: emails Sam the full
      quote (Reply-To = customer) AND sends the customer an auto-confirmation. Domain
      kulworks.com verified; consolidated to a single branded address `contact@kulworks.com`
      (from + reply-to + site). Sam set up Gmail send-as contact@ via Resend SMTP.
- [x] **Password-protected /admin dashboard** — email + password via Supabase Auth,
      server-side route guard (middleware), Profile bootstrap, owner/staff roles, multi-user
      ready. Login/logout built + verified. Create logins with `npm run admin:create`.
      (Still TODO: optional 2FA/MFA, rate-limited login, in-app "invite teammate" UI.)
- [x] **Mini CRM + BPM (read/browse)** — tabbed portal built: Dashboard (stats + upcoming
      due dates + recent submissions), Submissions, Projects, Clients. Each has expandable
      cards + grid view + search + CSV export. Activity log shown read-only in detail.
- [x] **Mini CRM + BPM (editing/mutations)** — DONE: convert Submission→Project, submission
      status change, project detail/edit page (all fields incl. stage/costs/dates/specs/
      shipping), client detail/edit page, add-project-for-client, add activity notes/logs.
      Via Next server actions (re-check auth). Demo data seeded (`npm run db:seed`, `--clean`
      to remove). Verified: build + edit round-trip.
- [x] **Payments** — itemized payments per project (amount + method: cash/card/PayPal/Venmo/
      Zelle/check/bank/other), with total paid + balance vs quote. Logged on project detail.
- [x] **Reminders (in-app)** — "set a reminder" (date + note) on projects/clients; auto-reminder
      created 3 days before a project's due date; Dashboard "Reminders" section shows
      open/overdue with mark-done. Dashboard upcoming + recent are now clickable.
- [x] **Idle auto-logout** — admin signs out after 30 min of inactivity.
- [x] **Reminders (notify me)** — DONE. `/api/cron/reminders` (secret-protected) emails Sam
      a daily digest of due/overdue reminders; `vercel.json` runs it daily at 13:00 UTC.
      (Cron only fires once deployed to Vercel.)
- [x] **Google Calendar integration** — BUILT. One-way push to a dedicated **Kulworks**
      calendar: project due + delivery dates and reminders (incl. the auto 3-day-before) sync
      as all-day events; edits/deletes in the app update/remove the same events (event ids
      stored on Project/Activity). Best-effort (never blocks a save). `lib/google-calendar.ts`,
      `scripts/google-calendar-setup.mjs`, `scripts/calendar-backfill.mjs`. **Needs Sam's
      one-time OAuth setup** — see "Resume here" above.
- [ ] **File storage for client artwork** — uploads instead of just a link/Drive checkbox.

## 📨 Newsletter / marketing email (also via Resend — no extra service)

- [x] **Newsletter signup form** — in the footer; posts to `/api/subscribe` (validate +
      honeypot). Verified.
- [x] **`subscribers` table + admin view** — signups stored in our DB (deduped); Subscribers
      admin tab with list + CSV export. Resend Audience sync comes with the sending phase.
- [x] **Send newsletters** — DONE. Subscribers auto-sync to a Resend Audience on signup;
      admin "Newsletter" tab composes + sends a Resend Broadcast (auto unsubscribe link).
      (Not live-fired yet — only demo subscribers exist. Add a physical mailing address
      to site data before real campaigns, for CAN-SPAM.)
- [ ] **Compliance** — Resend auto-adds unsubscribe links; marketing emails also need a
      physical mailing address (PO box OK) — ties to the empty address in site.ts.
- [ ] *(Later)* decide single vs double opt-in (default: single w/ clear consent).

### Newsletter v2 — extend in-house (Sam chose this 2026-07-02)
- [ ] **Subscriber tags/groups** + "send to group" selector (customer/prospect/interest).
- [ ] **Segmented sending** — Broadcasts only hit a whole Audience, so subset sends go via
      the email API to a filtered list + our OWN unsubscribe link + `/api/unsubscribe` handler.
- [ ] **Sent-newsletter log** in admin (track what went out, when, to whom).
- [ ] **Rich composer w/ images** — needs image hosting (Supabase Storage).
- [ ] **Pull open/click/bounce stats** from Resend API into the admin.
- [ ] **Optionally collect name/interest at signup** so there's data to segment on.
      (Age is impractical to collect; better levers: customer-vs-prospect, interest, location.)

## 📊 Page analytics (feeds the same DB + dashboard)

- [x] **Custom pageview tracker** — `/api/track` + cookieless `PageTracker` beacon (non-admin
      pages), logs path/referrer/geo/device/session; bots filtered. Verified.
- [x] **Analytics views in /admin** — Analytics tab: totals, unique visitors, 14-day bar,
      top pages, top referrers, devices, recent visits.
- [x] **Correlate visits with clients** — submission stores sessionId; submission detail shows
      "pages viewed before submitting."
- [ ] *(Optional)* Enable Vercel Web Analytics as a free accuracy backstop (one line).

## 🛡️ Hardening (added after smoke testing)

- [x] **Comprehensive smoke test** — `scripts/smoke-test.mjs` (npm-runnable via node): 21/21
      pass — every endpoint (valid/invalid/spam/auth), route guards, all DB mutations.
- [x] **Soft delete everywhere** — Submission/Project/Activity/Payment get `deletedAt`;
      "delete" archives (hidden from all views) and NEVER hard-deletes. All read queries
      filter `deletedAt: null`. (Future: an "Archived" view / restore.)
- [x] **Admin delete/archive buttons** — submissions, projects (+ cascade archive of its
      payments/activities), activities, payments — all with confirm dialogs.
- [x] **Newsletter send confirmation** — send now requires a confirm ("send to N?").
- [x] **Quote anti-flood** — same email within 60s is treated as a duplicate (protects DB +
      email quota).
- [x] **Admin error boundary** — friendly "try again" instead of a crash on transient errors.

## 🧭 Approved roadmap

**Tier 1 — before fully public (ALL SHIPPED ✅)**
- [x] **1. Admin password reset** — "Forgot password?" → Supabase reset email → /admin/reset. Live.
- [x] **2. Bot protection (Cloudflare Turnstile)** on /contact + newsletter. Live (real keys in Vercel).
- [x] **3. Privacy policy page** + footer link. Live at /privacy.
- [x] **4. Rate limiting** on /api/quote, /api/subscribe, /api/track (DB-based). Live.

**Tier 2 — high value (ALL SHIPPED ✅)**
- [x] **5. Artwork intake → Google Drive auto-folder** — creates + shares a Drive folder on
      request, emails the link, stores `driveFolderUrl` on the submission. Live.
- [x] **6. Archived / restore view** — /admin/archive lists soft-deleted items with restore. Live.
- [x] **7. Team invite UI + audit log** — invite-by-email + who-did-what audit log. Live.
- [x] **7b. Full admin management (Team page)** — add a team member (password now OR email
      invite, one merged form), edit email/role/phone, reset password, deactivate/reactivate
      (soft), change-my-password, 2FA. OWNER-only, audit-logged, guarded. Live.
- [x] **8a. Customer auto-confirmation on quote submit** — live.
- [x] **8b. Manual customer progress updates** — per-project "Send progress update" button
      (manual only) + one-click "Notify client: project started"; both logged with timestamps
      in the project's Activity timeline. Live.
- [x] **9. Error monitoring** — server errors captured to a DB ErrorLog, shown on the Team page. Live.

**Tier 3 — bigger**
- [ ] **10. Quote & invoice generation** *(NEXT — DISCUSS FIRST)* — build a quote/invoice in
      admin → email it. Sam wants **auto-send invoice** with **PayPal + Venmo** pay links
      (Square/Zelle also possible) — likely payment *links/requests*, not embedded checkout.
      Decisions needed: quote-then-invoice vs. just-invoices; auto-email with pay link.
- [ ] **11. Newsletter v2** — segmentation/tags, images, sent-log, open/click stats (scoped above).
- [x] **12. Google Calendar sync** — due/delivery dates + reminders → dedicated "Kulworks"
      calendar (one-way push). BUILT; needs Sam's one-time OAuth setup (see "Resume here").
- [x] **13. Scheduled data backup/export** — weekly `/api/cron/backup` emails a JSON backup +
      on-demand download on the Team page. Live.

**Other later (not blocking launch)**
- [ ] **File uploads for client artwork** — in-form upload (today it's a Drive-folder link).
- [ ] *(Optional)* Vercel Web Analytics one-line backstop; single vs. double opt-in decision.

## 🧹 Housekeeping

- [x] **Committed + pushed** — all work on branch `feat/backend-crm` (Vercel preview built).
- [x] **Full site + app audit (2026-07-03)** — crawled every page (all 30 internal links
      resolve, 0 broken), verified every form's fields match its action, all API
      methods/validation/auth-gating correct, send/receive paths reviewed. Fixes shipped:
      the "Delete this project" button (missing hidden id — did nothing), misleading
      "permanent" delete copy (they're soft/restorable), an extra login redirect hop, and
      placeholder social icons no longer render as live (broken) links until real handles
      are set. Team add/invite merged into one form; one-click "Notify client: project
      started" added. 21/21 smoke.

## ✅ Done

- [x] Confirmed local copy is in sync with GitHub (nothing to pull).
- [x] Confirmed hosting: Vercel + GitHub (push = auto-deploy).
- [x] Decided direction: custom DB backend (not a form-only service or Google Form).
