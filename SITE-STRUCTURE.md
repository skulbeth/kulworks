# Kulworks — Site Structure

A human-readable map of every page/URL, what it is, and where its content lives. For the
deeper system reference (routes, data models, integrations, "if X breaks"), see
**[ARCHITECTURE.md](ARCHITECTURE.md)**. Content-editing tips live in **[LAUNCH-TODO.md](LAUNCH-TODO.md)**.

> **Status: LIVE (2026-07-23).** `constructionMode: false` in [`src/data/site.ts`](src/data/site.ts) —
> the real home page is the public main page and the whole site is indexable. `ComingSoon.tsx` is
> kept in the repo (rendered only if the switch is flipped back to `true`).

---

## Public site (marketing)

```
/                         Home — hero, shop carousel, who-it's-for, services,       src/app/page.tsx
│                         and one prototyping + portfolio section (side-by-side cards)
├─ /about                 About — maker-shop story; order: intro → machines →       src/app/about/page.tsx
│                         story → differentiators → CTA
├─ /services              Services overview (5 crafts); card-printing leads with a   content: src/data/services.ts
│                         gold "featured highlight" callout (Service.featuredHighlight)
│  └─ /services/card-printing            Card-printing hub (lead service)   content: src/data/cardCluster.ts
│     ├─ /services/card-printing/poker-cards
│     ├─ /services/card-printing/tarot-cards      (HIDDEN: hidden:true — builds but noindexed + unlinked; offered via text)
│     ├─ /services/card-printing/game-prototypes
│     ├─ /services/card-printing/trading-cards
│     ├─ /services/card-printing/giant-cards      (HIDDEN: hidden:true — builds but noindexed + unlinked; offered via text)
│     ├─ /services/card-printing/boxes-and-upgrades
│     └─ /services/card-printing/card-design
├─ /pricing               Pricing table + card calculator       content: src/data/pricing.ts
├─ /portfolio             Work grid (filter by craft)           content: src/data/portfolio.ts
├─ /guides                Guides & FAQ index          content: src/data/guides.ts + src/data/faq.ts
│  ├─ /guides/poker-vs-tarot-card-sizes
│  ├─ /guides/prep-card-art-for-printing
│  ├─ /guides/prototype-vs-short-run   (how-many-prototype-copies merged in → redirects here)
│  └─ /guides/print-and-play-vs-real-prototype
├─ /who-its-for           Audience page (9 cards)                content: src/data/audiences.ts
├─ /contact               Quote form + service area + contact info   src/app/contact/page.tsx
├─ /privacy               Privacy Policy                         src/app/privacy/page.tsx
└─ /terms                 Terms of Service                       src/app/terms/page.tsx
```

**Chrome & fallbacks**
- Header/Footer applied by `src/components/SiteFrame.tsx` (skipped on `/admin`); footer also
  hosts the newsletter signup + area/shipping line.
- Custom **404**: `src/app/not-found.tsx`.
- SEO endpoints: `/sitemap.xml` (`src/app/sitemap.ts`), `/robots.txt` (`src/app/robots.ts`),
  `/icon.svg`. Default share image: `public/images/og-default.png` (regenerate: `npm run og`).
- Every page has one `<h1>` and injects JSON-LD (Organization, WebSite, LocalBusiness, plus
  Service/Breadcrumb/FAQ/Article per page) via `src/lib/structured-data.ts`.

> **Sitemap note:** `/privacy` and `/terms` are intentionally left out of the sitemap (linked in
> the footer, still crawlable/indexable). All 17 marketing URLs above are in the sitemap.

---

## Admin portal (login-gated) — `/admin`

Full detail in [ARCHITECTURE.md §2](ARCHITECTURE.md). Quick map:

```
/admin/login              Sign in (+ 2FA step, forgot password)
/admin                    Dashboard — stats, due dates, reminders, recent submissions
/admin/submissions        Quote requests (status, convert→project, archive)
/admin/projects[/id]      Projects (BPM): stage, specs, costs, dates, payments, activity,
                          client emails; project dates + reminders sync to Google Calendar
/admin/clients[/id]       CRM: contact info, projects, activity, email composer
/admin/subscribers        Newsletter list (+ CSV)
/admin/newsletter         Compose + send a Resend broadcast
/admin/analytics          Page-view analytics
/admin/team               Team members, password/2FA, audit log, backups, system errors
/admin/archive            Soft-deleted items + restore
```

Admin mutations live in `src/app/admin/(portal)/_actions.ts` (server actions, auth re-checked).

---

## API routes — `/api`

```
POST /api/quote           Save quote → notify Sam + confirm customer + SMS + optional Drive folder
POST /api/subscribe       Newsletter signup → Subscriber + Resend Audience
POST /api/track           Cookieless page-view beacon
GET  /api/cron/reminders  Daily due/overdue reminders digest email       (CRON_SECRET)
GET  /api/cron/backup     Weekly JSON backup email                       (CRON_SECRET)
GET  /api/admin/backup    On-demand JSON backup download                 (logged-in)
GET  /auth/callback       OAuth code exchange (password reset / invite)
```

Invoices/quotes have a public view at `/invoice/[token]` (unguessable token).

---

## Where content lives (edit these, not components)

| Content | File |
|---|---|
| Business info, contact, socials, payments, **service area**, launch switch | `src/data/site.ts` |
| Services (overview + contact-form dropdown) | `src/data/services.ts` |
| Card-printing hub + sub-pages | `src/data/cardCluster.ts` |
| Pricing | `src/data/pricing.ts` |
| Portfolio items | `src/data/portfolio.ts` |
| Guides / articles | `src/data/guides.ts` |
| FAQ | `src/data/faq.ts` |
| Audiences ("who it's for") | `src/data/audiences.ts` |

Images go in `public/images/{portfolio/<category>, hero, services, studio}/`; point a data
item's `src` at them (see LAUNCH-TODO.md). The default social image is `public/images/og-default.png`.
