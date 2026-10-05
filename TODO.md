# Kulworks — To-Do

## Session log

Full detail for 2026-10-04 (header social buttons + Facebook, Who It's For out of the
nav and why that is SEO-safe, the logo-distortion and nav-overlap fixes, and the sideways
scroll on tablets which turned out to be the footer newsletter form) is in
`docs/SESSION-2026-10-04.md`, including the traffic numbers the nav call was based on and
how to measure layout with playwright-core.

Full detail for 2026-10-02/03 (clips to video, carousel fixes, testimonials, caching,
the 37 MB archive move, portfolio notes, tile pricing) is in
`docs/SESSION-2026-10-02-03.md`, including the sources checked and rejected, the
constraints on what may be said about client work, and the environment traps.

Working list for launch + the custom backend build. Grouped by theme, not strict order.
For how the whole system fits together, see **[ARCHITECTURE.md](ARCHITECTURE.md)**.

---

## ▶️ Resume here (pick up on any machine / next session)

**Status:** **LIVE since 2026-07-23** — `constructionMode: false`, the real home page is
public and indexable at kulworks.com. The full custom backend is built and shipped. See the
✅ items below for everything done. (The roadmap wording immediately below this still reads
as though launch is pending; it predates the launch and has not been rewritten.)

**Roadmap order (Sam, 2026-07-03):** (1) 2FA method choice app-or-email ✅ SHIPPED →
(2) #10 Quotes & Invoices (Venmo + PayPal) ✅ SHIPPED → (3) Newsletter v2 →
(4) Google Calendar ✅ SHIPPED + LIVE (OAuth setup done 2026-07-15) →
(5) **Real site content + photos** (copy, portfolio/service images) ← *next* → then flip
construction mode off to launch.

**Next up:** **Real site content + photos** (roadmap #5) — copy proofread, portfolio/service
images, address/socials in `site.ts`. Newsletter v2 (#11) remains available if preferred.
Remaining non-code launch work is tracked in "Beyond code — business/ops gaps" below.

**Google Calendar — setup complete (2026-07-15).** OAuth app published to Production (so
refresh tokens don't expire), Calendar API enabled, `GOOGLE_REFRESH_TOKEN` + `GOOGLE_CALENDAR_ID`
set in `.env.local` + Vercel. Verified live via `npm run e2e` (26/26). Project dates + reminders
now sync automatically to the "Kulworks" calendar. (If ever re-doing on a new Google project:
`npm run google:auth` → `npm run google:calendar` → set both env vars → `npm run calendar:backfill`.)

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

**Deploy:** push to `main` → Vercel auto-deploys production. `constructionMode` is already
`false` (launched 2026-07-23); leave it that way. Verify a deploy with node `fetch` against
kulworks.com — curl is sandboxed in this environment.

---

## 🚀 Launch blockers (before the site goes fully public)

These are empty placeholders in [src/data/site.ts](src/data/site.ts) and elsewhere that
should be filled with real info before launch:

- [ ] **Street address** — `site.ts:40` (only if you have a public storefront)
- [ ] **Postal code** — `site.ts:43`
- [ ] **Mailing address / PO box** — Sam doesn't have one yet. Required in marketing-email
      footers (CAN-SPAM) before sending real newsletters; get a PO box, then add to site data.
- [x] **Social handles** — DONE. Facebook + Instagram point at Role to Reign and YouTube at
      @kulworks; confirmed deliberate (2026-10-02), the brands share an audience.
- [ ] **PayPal.me handle** — `site.ts`, still `REPLACE_WITH_PAYPAL_ME_HANDLE` (Venmo + Zelle set)
- [ ] **Proofread every page** in Sam's voice.
- [x] **Real testimonials / social proof** - DONE 2026-10-05. **12 published** from Sam's own
      Messenger/WhatsApp/Facebook screenshots: Matthew H., Daena V. x2, Eddie D., Nick A. x2,
      Brad M., Phase Game, Kevin E., Lala M., Mike M., Eric E. Each carries a project label and
      an item photo; 11 of 12 also link the original message. Screenshots are blurred (name AND
      profile photo) and Sam's own name was kept off the page.
      **Placement (Sam's call): the `/testimonials` page ONLY** - the home-page strip was removed
      and the page is linked from the FOOTER under Explore. `Testimonials.tsx` is kept but
      unrendered, like `ComingSoon.tsx`.
      **Neither image shows inline** - "See the item" and "See the message" are text links that
      open the `Lightbox` (`TestimonialProof.tsx`). Inline images made every card a different
      height and left dead space.
      `Testimonial.photoPath` was added for the item photo (migration
      `20261005140000_testimonial_item_photo`); most item photos came from the portfolio files
      already in `public/images/portfolio/`.
      STILL OPEN: (a) **the admin has no field for item photos**, so they can only be attached by
      script - worth adding if Sam wants to maintain this himself; (b) Lala M.'s message
      screenshot; (c) the hummingbird feeder photo is a VIDEO THUMBNAIL and has a play button
      painted on it; (d) consent for the private DMs is recorded as "published at the owner's
      direction", not opt-in from the authors - the built-in request-link flow would fix that.
- [ ] ~~Real testimonials~~ (original notes kept below for reference)
      SYSTEM BUILT (2026-10-02).
      No Google Business account needed. Two ways in:
        * Admin > a client > "Ask for a testimonial" emails them a single-use link
          (`/testimonial/<token>`). They write it, pick the display name, tick consent.
        * Admin > Testimonials > "Add one you already have" for a quote you have in hand,
          a screenshot of a text/email, or both.
      Nothing publishes without recorded consent; `consent` is enforced at publish AND in
      the public query, so a row forced to PUBLISHED without it still renders nothing.
      Archiving is a soft delete and is restorable. Public page is `/testimonials`; the home
      strip shows 3 (pinned first) and only links on when there are more than 3. Both render
      nothing at all while nothing is published.
      Code: `src/lib/testimonials.ts`, `src/app/admin/(portal)/_testimonial-actions.ts`,
      `src/app/admin/(portal)/testimonials/`, `src/app/testimonials/`, `src/app/testimonial/[token]/`,
      `src/app/api/testimonial/`, `src/app/api/testimonial-image/[id]/`.
      NOTE: the old `src/data/testimonials.ts` is GONE; testimonials live in the DB now.
      NOTE: deliberately NO Review/AggregateRating structured data - Google has ignored
      self-serving review markup about your own business since 2019.
      NEXT: Sam said (2026-10-02) he already has quotes in hand. He needs to paste them in,
      or add them at /admin/testimonials and publish, and say which to pin to the home page.
- [~] **Real photos** — MANY DONE (2026-07-21, via a sibling session: 15 WebP images wired into
      portfolio, services, home carousel, about portrait, and 3 card sub-pages). Remaining slots
      still on labeled placeholders — see the shot-list below.
- [x] **OG share image** — DONE. Branded `public/images/og-default.png` (1200×630) generated
      (`npm run og`, `scripts/make-og.mjs`). Swap for real art anytime by replacing the file.
- [x] **On-page SEO polish (2026-07-15)** — added a real `<h1>` to every page (was `<h2>`
      via SectionHeading — fixed with an `as` prop); expanded `areaServed` schema to San
      Antonio + Hill Country towns (Bulverde, Blanco, Spring Branch, etc.); added a nationwide-
      shipping note (footer + Contact "Where we work"). Kept visible copy lean — town list
      lives in structured data, not on-page keyword lists.
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
- [x] **LAUNCHED (2026-07-23)** — `constructionMode: false`; the real home page is now the
      public main page and the site is indexable. `ComingSoon.tsx` kept in the repo (not
      deleted), just no longer rendered. Went live "with what we can" — the items below
      (socials, PayPal, postal code, tarot/giant + who-it's-for photos, proofread) are
      post-launch polish, not blockers.

### 📸 Remaining photos — shot-list (fill these placeholder slots)

Spec (image optimization is OFF): final-compressed **WebP**; **4:3 ~1200×900** for
portfolio/service/about/card-page slots, **3:2 ~1200×800** for the home studio carousel.
Drop the file in the matching `public/images/...` folder and set the `src`/`image` string.
Alternates for some of these are in `D:\Kulworks\Raw Footage\Website Selects\`.

- [x] **Filament / FDM** — DONE 2026-07-22 (Custom Prop Print → armor; FDM service → city
      upgrades). Replacement Components + City Upgrade Pieces items were removed → folded into
      the portfolio "we also make…" note.
- [x] **Design / 3D modeling** — DONE 2026-07-22 (3D Model Showcase → animated Shapr3D model;
      Tile Artwork Prep → Inkarnate; boxes-and-upgrades → Shapr3D CAD box insert).
- [x] **tarot + giant card pages** — HIDDEN 2026-07-23 (no photos). `hidden: true` on those
      cardCluster entries → filtered from the hub accordion + sitemap + noindex, but the pages
      still build (restore by removing the flag). Offered on custom order via text on the
      card-printing hub + the portfolio "just ask" note. Kept in the calculator (already there).
      Only add photos if/when reviving the dedicated pages.
- [ ] **"Who it's for" thumbnails (12)** — Sam wants a small picture for EACH audience card
      instead of the emoji icon. Items: Sports Teams, Schools & Clubs, Game & Card Designers,
      Designer Prototypes, Our Own Games, Wedding Venues, Work Parties, Events & Celebrations,
      Photographers, Local Activities & Market Sellers, Game Stores, Convention Attendees.
      Small square works best (1:1, ~600×600 WebP). Needs a code change too: add an optional
      `image?` to the `Audience` type (`src/data/audiences.ts`) and have `AudienceCard` render
      it in place of the icon when set (shown on home + `/who-its-for`).
- [ ] **Sharper animated clips (optional)** — the 6 animated WebPs (board-tiles, card-fronts,
      card-backs, race-3d-model, dice-tumbler, custom-cards) are sourced at ~480px and look
      soft on desktop. Re-export from higher-res recordings (720–1080p) if available.
- [ ] **Home "portfolio highlights" (3)** — still the older sibling-session shots
      (character-cards-in-jig, terrain-hexes-hero, miniatures-plate-hero); swap to newer/better
      ones for consistency (optional).
- [x] **Real OG/social-share image** - DONE 2026-10-03. Rebuilt as the logo plus one
      line, PROTOTYPE MANUFACTURER; the old one had an em dash and three stacked lines
      that were illegible at the size previews actually render. `npm run og` regenerates.
- [ ] **Home hero image or short video (optional, high-impact)** — the hero is text-only.
- [ ] **Retired UV-printer-screen photo** (`card-layout-artwork.webp`) — kept in repo, not shown;
      decide whether to place it (a "printing in progress" shot) or leave retired.

## 🗺️ UX / information architecture

- [ ] **"Feels like a lot of pages" — nav/workflow map** (Sam, 2026-07-23) — Sam wants a visual
      map of how all the pages connect (a flow/sitemap diagram), and it may point to simplifying
      the IA (fewer top-level pages, or grouping). Pages today: Home, About, Services (+ card-
      printing hub + 5 visible sub-pages), Pricing, Portfolio, Guides (+ 5 guides), Who It's For,
      Contact, Privacy, Terms. Deliverable: a connections/flow diagram (could be a Mermaid diagram
      or an Artifact), then decide if anything should be merged/nested. See SITE-STRUCTURE.md for
      the current page inventory.

- [ ] **Portfolio build-out — clickable items → full showcase pages?** (Sam, 2026-07-23) — idea:
      the section *below each portfolio image* (title/caption area), when clicked or tapped, takes
      you to a full location where all the showcases for that piece live (more photos, the story,
      specs, related work). Not decided yet — **determine the best way to build this out** before
      implementing. Options to weigh: (a) per-item detail pages (`/portfolio/[slug]/`) driven off
      `portfolio.ts`, good for SEO and deep links; (b) an expanded lightbox/gallery per item (stays
      on-page, lighter build, weaker SEO); (c) group items into a few "showcase" collection pages.
      Today portfolio items only open the single-image lightbox (`Lightbox.tsx` via `PortfolioGrid`).
      Decide the model, then wire the caption/below-image area as the click target.

Data locations: portfolio items → `src/data/portfolio.ts` (`src`); services → `src/data/services.ts`
(`image`); card sub-pages → `src/data/cardCluster.ts` (`image`).

## 🧩 Beyond code — business / ops gaps (the stuff that isn't the site)

Asked "what else am I missing" (2026-07-15). The software is done; these are the non-code
things that actually gate running the business. Roughly by priority:

**Legal / money (do before invoicing real customers):**
- [ ] **Texas Sales & Use Tax permit** — invoices now show a flat 9% *service charge* (not an
      itemized tax), but if your sales are taxable you still must register with the TX Comptroller
      and remit sales tax. Relabeling doesn't remove the obligation.
- [ ] **Vercel plan** — the site is on the **Hobby** plan, which is for *non-commercial* use.
      A real business likely needs **Vercel Pro (~$20/mo)** to comply with their ToS (also
      lifts cron/limits). Verify + upgrade before/at launch.
- [ ] **Business payment accounts** — Zelle points to a *personal* email/phone and Venmo is
      `@kulworks`; Venmo for goods/services is supposed to use a **business profile** (personal
      use for business risks frozen funds). Consider a business bank account to separate money.
- [ ] **PayPal.me handle** — still `REPLACE_WITH_PAYPAL_ME_HANDLE` in `site.ts` (invoice pay link).
- [ ] **Business formation / DBA + insurance** — LLC vs. sole prop, DBA if "Kulworks" isn't
      your legal name, and general/product liability insurance. (Real-world, not the site.)
- [x] **Terms of Service page** — DONE. `/terms` (footer-linked) covering quotes/payment,
      artwork & IP rights, proofs/approval, custom-goods refunds, liability cap, Texas governing
      law. Solid template — worth an attorney's once-over before you rely on it.
- [ ] **PO box / mailing address** — required in newsletter footers (CAN-SPAM) before real sends.

**Get found / measure (post-launch):**
- [ ] **Google Business Profile** — the single biggest local lever. Set up as a SERVICE-AREA
      business: Sam works from home (a shed), so HIDE the residential address and list service
      areas instead (San Antonio, Bulverde, Blanco, Spring Branch, etc.). Pick a print-shop
      category, add services, photos, hours, and the kulworks.com link, then verify (phone/video/
      postcard). Chase Google reviews after. In progress (Sam, 2026-07-24).
- [x] **Google Search Console** — DONE 2026-07-24: domain verified via DNS TXT, sitemap
      (`/sitemap.xml`) submitted + processed (Success, 18 pages). NEXT: URL Inspection → Request
      Indexing on homepage + top pages to speed first crawl. (Site was noindex until launch, so
      it is not indexed yet as of 07-24 — `site:kulworks.com` returns nothing, which is a normal
      cold start, not a problem.)
- [ ] **Bing Webmaster Tools** — verify + submit the sitemap (same idea as Search Console).
- [ ] **Off-site promotion + first mentions** (Sam, 2026-07-24):
      - [ ] **Facebook Page** for Kulworks — then send me the URL so I add it to the footer
            socials + `sameAs` schema (alongside Instagram/YouTube).
      - [ ] **Facebook posts** announcing the shop and linking kulworks.com.
      - [ ] **Reddit post** (e.g. r/boardgames, r/sanantonio, local maker/tabletop communities) —
            genuine and helpful, not spammy, with a link back to the site.
      - [x] **Backlink from roletoreign.com → kulworks.com** — DONE 2026-07-24 (live in the Role to
            Reign Artist Credits section; a real followed link, first external trail to the site).
- [ ] **Make Kulworks UV-printed business cards** (Sam, real-world task, not a site change) — his
      own cards to hand out at cons, local shops, and networking. Dogfoods the UV card service and
      doubles as a sample piece. Put the site URL + socials + QR to kulworks.com on them.
- [ ] **Flesh out other card styles + print examples** (Sam) — produce physical print samples of the
      other card styles (tarot, giant/jumbo, trading-style, alternate backs/finishes) to show range.
      These become portfolio photos AND can un-hide the tarot + giant card pages (currently
      `hidden: true` only for lack of photos — see the "Remaining photos — shot-list" above). Also
      handy as demo/sample pieces to hand clients.

**Deliverability / email:**
- [x] **DMARC record** — ALREADY IN PLACE (discovered 2026-07-15). A `_dmarc` TXT already
      exists at `p=none` (monitor), with reports going to Mailgun + OnDMARC. Do NOT add a second
      one (two DMARC records = both ignored). Later, tighten `p=none` → `quarantine` → `reject`
      once all legit senders confirm passing.
- [ ] **Confirm access to Mailgun + OnDMARC accounts** — inbound mail (MX) routes through
      **Mailgun** and SPF is `include:mailgun.org`; DMARC reports go to Mailgun/OnDMARC. You DO
      need inbound working (customer replies to contact@kulworks.com land there). Inbound-forwarding
      probe sent 2026-07-15 → if it reached your Gmail, forwarding works; still get the Mailgun
      login so you can manage/not lose it. Try mailgun.com sign-in with kulworksdesign@gmail.com.
- [x] **Spam-placement test** — test emails sent 2026-07-15 (placement + inbound) via Resend.
      Auth is in place (DKIM `resend._domainkey`, SPF, DMARC p=none). Sam to eyeball Gmail
      placement (inbox vs spam/promotions); re-run anytime by sending a real quote to yourself.

**Reliability / ops:**
- [x] **Production `SUPABASE_SECRET_KEY` fixed** (2026-08-03) — was invalid in Vercel ("Invalid API
      key" for all service-key ops on live). Sam updated it in Vercel Production + redeployed;
      verified by successfully adding `sam.kulbeth@gmail.com` as OWNER via the Team form (and logging
      in). The photo-upload (`/upload`) + card-order (`/order`) Storage features use the same key, so
      they should now work on live too — worth a quick live spot-check when convenient (toggle uploads
      on, send a test photo; run a test order). Team-create errors now classify accurately
      (`emailtaken`/`serverkey`).
- [x] **Error alerting** — DONE. `logError` now emails `QUOTE_NOTIFY_EMAIL` on new server errors,
      throttled to at most one every 15 min (`src/lib/log-error.ts`).
- [x] **Domain auto-renew** — confirmed ON by Sam (2026-07-15).
- [ ] **Rotate the Google refresh token** — during setup the live token was pasted into chat, so
      it's technically still "exposed." Re-run `npm run google:auth` once for a never-shared token,
      then update `GOOGLE_REFRESH_TOKEN` in `.env.local` + Vercel. Low urgency, needs Sam.
      *(Uptime monitoring: dropped per Sam 2026-07-15.)*

**On-site polish (code — small, in our control):**
- [x] **OG share image** — DONE (branded `og-default.png`, `npm run og`).
- [x] **Custom 404 page** — DONE (`src/app/not-found.tsx`, on-brand with links back).
- [x] **Security headers** — DONE (`next.config.mjs` sets HSTS, X-Frame-Options,
      X-Content-Type-Options, Referrer-Policy, Permissions-Policy). CSP still deferred (needs
      nonces/hashes for the inline theme-init script + JSON-LD — a wrong CSP breaks the site).
- [ ] **Content-Security-Policy** — the one on-site item left: add a CSP with per-route
      nonces/hashes. Deferred because a wrong CSP silently breaks the theme + JSON-LD.
- [ ] **Image optimization** — `images.unoptimized: true`; logo PNG is oversized. Revisit for
      Core Web Vitals once real photos land.

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
- [x] **Google Calendar integration** — SHIPPED + LIVE (2026-07-15). One-way push to a dedicated
      **Kulworks** calendar: project due + delivery dates and reminders (incl. the auto 3-day-before)
      sync as all-day events; edits/deletes in the app update/remove the same events (event ids
      stored on Project/Activity). Best-effort (never blocks a save). `lib/google-calendar.ts`,
      `scripts/google-calendar-setup.mjs`, `scripts/calendar-backfill.mjs`. OAuth setup done +
      verified live (26/26 e2e).
- [x] **Trade-show photo uploads** — DONE 2026-07-31. Public `/upload` (QR target) lets people
      send up to 5 photos with optional name/contact/note → private Supabase `uploads` bucket +
      email to Sam (signed links) + admin **Uploads** tab (thumbnails, mark handled, delete).
      Runtime on/off toggle + printable QR in the admin; OFF by default. This also stands up the
      **Supabase Storage** plumbing (`src/lib/uploads.ts`, bucket setup script) that the in-form
      artwork upload below can reuse.
- [ ] **File storage for client artwork** — in-form uploads on the quote form (not just a
      link/Drive checkbox). Storage infra now exists (see trade-show uploads above) — reuse it.
- [~] **"Design your cards" builder** — v1 SHIPPED 2026-08-01 (`/order`). Browse card DESIGNS,
      pick one, fill that design's own fields + attach photos → lands in Submissions with the art
      attached. Data-driven: each design is one entry in `src/data/cardTemplates.ts` + a preview
      image (no new DB table per design; all orders share the Submission table + uploads bucket).
      NEXT: (1) Sam supplies real designs — a front preview + field list each (baseball/basketball
      derived from his mockups; swap the temporary stock previews under card-printing images for
      real ones in `public/images/card-templates/`); (2) **categories + filtering** on the gallery
      once there are many (add `category` to the template type + filter UI); (3) optional
      **admin-managed designs** (move templates to a DB table + "Manage designs" admin CRUD) only if
      Sam wants to add designs without editing code.
      CURRENT STATE (2026-08-01): built + working but **unlinked, noindexed, and out of the sitemap**
      (placeholder designs only). Sam will prepare + print real designs first, then re-link it
      (card-printing CTA), remove `robots.index:false` in `app/order/page.tsx`, and re-add `/order/`
      to `sitemap.ts`.

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
- [x] **10. Quote & invoice generation** — SHIPPED. Line-item quotes/invoices in admin, a
      client-facing page at `/invoice/[token]`, and PayPal/Venmo/Zelle pay links (see
      `Invoice`/`InvoiceItem` models + `InvoiceEditor`). Only loose end: the PayPal.me handle
      placeholder in `site.ts` (listed under launch blockers).
- [ ] **11. Newsletter v2** — segmentation/tags, images, sent-log, open/click stats (scoped above).
- [x] **12. Google Calendar sync** — due/delivery dates + reminders → dedicated "Kulworks"
      calendar (one-way push). SHIPPED + LIVE (OAuth done, verified 26/26 e2e).
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

- [x] **Quote from a lead, in one flow (2026-10-02).** "Quote this" on a submission creates
      the project and a draft quote together, instead of converting and remembering to come
      back. Quotes can now carry a **deposit %** (`Invoice.depositPct`), which makes a quote
      payable up front: the client sees "X now, Y on completion" with the Venmo/PayPal/Zelle
      links set to the deposit, not the total. The client page also collects the shipping
      address straight onto the client record, and the send email can carry the shared Drive
      folder. Migration `20261002093000_invoice_deposit`.
      **Deliberate limit:** a real Venmo *business request* is not buildable. Venmo has no
      public API for third parties to raise requests. What ships is the pay-intent deep link
      with the amount prefilled. A genuinely tracked request would mean PayPal invoicing
      (approved business account), and `site.payments.paypalMe` is still a placeholder.
- [x] **Gmail sync into the client timeline (2026-10-02).** "Pull email from Gmail" on a
      client reads the thread with that address and files it as activity. Read-only
      (`gmail.readonly`), one address per sync, headers and snippet only, never the body.
      Deduped on `Activity.externalId` (unique), so re-running adds nothing.
      **⚠️ ONE STEP LEFT, it is off until this is done:** the refresh token still carries
      Drive + Calendar only, so Gmail answers 403 and the admin says so. To switch it on:
      ```
      npm run google:auth          # scopes now include gmail.readonly
      ```
      then paste the NEW refresh token into `GOOGLE_REFRESH_TOKEN` in `.env.local` **and**
      in Vercel (Project → Settings → Environment Variables), and redeploy. The old token
      keeps working for Drive and Calendar until replaced, so nothing breaks in between.
      **Not built:** AI summaries of a thread. That needs an Anthropic API key and has a
      per-use cost, unlike everything else in this stack. Decide separately.
- [x] **Split invoicing (2026-10-02).** "Invoice the balance" raises an invoice for what is
      left once the deposit is in. Billed at a zero service-charge rate because the charge
      was already applied to the original total; raising a second balance on the same
      document is refused. Verified: deposit + balance lands exactly on the quote total.
      Converting a deposit quote now keeps the deposit instead of billing in full.
      Also added `ResultBanner`: actions have always redirected with `?done=`/`?error=`
      codes that no page read, so a refused action looked like a click that did nothing.
- [x] **Media quality pass (2026-10-01).** Went through the raw library on `D:\Kulworks`.
      13 new assets into the home carousel and the portfolio: the print head passing over
      the navy and gold boards under the curing lamps (the best shot in the library, now
      carousel slide 2), the hex actually coming free of the clicker die, double-sided
      board printing, a card run curing under UV, four PANIC deck clips, an Orc hero card,
      stacks of cut tiles (first shot anywhere showing a real production run), and a resin
      plate lift. Nothing deleted. **Full list, plus which live assets are soft enough to
      be worth re-exporting and what is still unmined, is in [MEDIA-REVIEW.md](MEDIA-REVIEW.md).**
      Biggest open item: the 8 GB ASMR cutting file has the best footage but is a vertical
      shot that no 3:2 crop serves; cut cycle is at 608-628s.
- [x] **Role to Reign analytics in the Kulworks admin (2026-09-25).** One `site` column
      on `PageView` (default "kulworks") instead of a second set of tables, so every
      query, index and chart is reused. Role to Reign stays a static front end with no
      backend: its visitors beacon straight to `/api/track` here, which is what keeps geo
      working. Endpoint takes cross-origin posts from an allowlist of both domains plus
      previews and localhost; beacons go as text/plain to skip the CORS preflight.
      Analytics page has Kulworks / Role to Reign / Both tabs; weekly email stays Kulworks
      figures plus one Role to Reign line. Migration `20260925090000_pageview_site`.
      Google Analytics left running on Role to Reign alongside it.
      **Open follow-up:** Role to Reign has no privacy page, and it now sends visitor data
      to kulworks.com. Worth a short note there. Sam to decide the wording.
- [x] **Fixed: Vercel geo headers were stored percent-encoded (2026-09-25).** Top Cities
      had been showing "New%20Braunfels" since tracking went in. Decoded on write, and the
      683 existing rows were decoded in place.
- [x] **Type + palette overhaul (2026-09-24).** Palette sampled from photographs of real
      Kulworks work (lime from the award filament, ink and signal blue from the UV-printed
      boards, brass from their gold linework) rather than framework defaults. Familjen
      Grotesk headings, IBM Plex Sans body, IBM Plex Mono for anything measured. Hero cut
      to one claim. Every text pairing clears WCAG AA in both themes. See DESIGN-NOTES.md.
- [x] **No em dashes anywhere a person reads (2026-09-25).** Site copy, customer emails,
      error messages, admin UI, email subjects. Standing preference. Code comments still
      have them; nothing renders those.
- [x] **Contacts (lost clients) + notes (2026-09-23).** `Client.kind` (CLIENT/CONTACT) +
      `lostReason` / `lostAt`; Clients page has Clients / Contacts / All tabs; client detail
      has a "Move to contacts" (with reason) ⇄ "Move back to clients" toggle and a dated
      Notes log. Nothing is ever deleted — same record, history intact. Migration:
      `20260923120000_client_kind` (applied to prod).
- [x] **Submission status filters (2026-09-23).** Open / New / Contacted / Quoted / Won /
      Lost / All tabs with counts; defaults to Open so won + lost are hidden. Shared
      `FilterTabs` component (also used by Clients).
- [x] **Portfolio: 3D-printed client work + UV board printing (2026-09-23).** Added
      Color-Coded Hospital Tags and UV-Printed Game Boards tiles; the custom race awards go
      in the existing galleries (designs → Custom 3D Models, printed sets → Filament/FDM)
      rather than a tile of their own; helmet prop now leads Custom Prop Print;
      finished/bagged client deck added to the cards gallery. Photos →
      WebP (1600px long edge), videos → looping animated WebP clips, per existing convention.
- [x] Confirmed local copy is in sync with GitHub (nothing to pull).
- [x] Confirmed hosting: Vercel + GitHub (push = auto-deploy).
- [x] Decided direction: custom DB backend (not a form-only service or Google Form).
