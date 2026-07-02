# Kulworks — To-Do

Working list for launch + the custom backend build. Grouped by theme, not strict order.

---

## 🚀 Launch blockers (before the site goes fully public)

These are empty placeholders in [src/data/site.ts](src/data/site.ts) and elsewhere that
should be filled with real info before launch:

- [ ] **Street address** — `site.ts:40` (only if you have a public storefront)
- [ ] **Postal code** — `site.ts:43`
- [ ] **Mailing address / PO box** — Sam doesn't have one yet. Required in marketing-email
      footers (CAN-SPAM) before sending real newsletters; get a PO box, then add to site data.
- [ ] **Social handles** — `site.ts:59`, still `REPLACE_WITH_HANDLE` placeholders
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
- [ ] **Google Calendar integration** — (eventually) sync due/delivery dates + reminders
      (remindAt/dueDate already stored to make this straightforward).
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

## 🧭 Approved roadmap (Sam wants all of these — build in chunks)

**Tier 1 — before fully public**
- [ ] **1. Admin password reset** — "Forgot password?" on login → Supabase reset email →
      /admin/reset to set new password. (Needs: allow the reset redirect URL in Supabase
      Auth settings; optionally brand the email via Supabase SMTP = Resend.)
- [ ] **2. Bot protection (Cloudflare Turnstile)** on /contact + newsletter. (Needs: Sam's
      Cloudflare Turnstile site key + secret. Build no-op until keys set.)
- [ ] **3. Privacy policy page** + footer link.
- [ ] **4. Rate limiting** on /api/quote, /api/subscribe, /api/track (DB-based; no new service).

**Tier 2 — high value**
- [ ] **5. File uploads for artwork** — Supabase Storage; upload on quote form + shown in admin.
- [ ] **6. Archived / restore view** — see + restore soft-deleted items.
- [ ] **7. Team invite UI + audit log** — invite teammates from admin; log who changed what.
- [ ] **8. Automated status emails** — e.g., stage → "Delivered" emails the customer.
- [ ] **9. Error monitoring** — capture server errors (DB error log in admin now; Sentry optional later).

**Tier 3 — bigger**
- [ ] **10. Quote & invoice generation** *(DISCUSS FIRST)* — build a nice quote in admin →
      PDF/email. Sam wants **auto-send invoice from admin**. Payment via **Square (has acct),
      PayPal (will set up), Venmo, or Zelle** — likely payment *links/requests* rather than
      embedded checkout. Circle back to choose provider + flow.
- [ ] **11. Newsletter v2** — segmentation/tags, images, sent-log, open/click stats (scoped above).
- [ ] **12. Google Calendar sync** — due/delivery dates + reminders.
- [ ] **13. Scheduled data backup/export** — weekly export cron (Supabase free tier backups are limited).

## 🧹 Housekeeping

- [x] **Committed + pushed** — all work on branch `feat/backend-crm` (Vercel preview built).

## ✅ Done

- [x] Confirmed local copy is in sync with GitHub (nothing to pull).
- [x] Confirmed hosting: Vercel + GitHub (push = auto-deploy).
- [x] Decided direction: custom DB backend (not a form-only service or Google Form).
