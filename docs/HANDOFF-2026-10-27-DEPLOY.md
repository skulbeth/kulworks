# Handoff: deploy the 2026-10-27 work (from the work laptop to the home PC)

Branch: `deploy-2026-10-27` on GitHub (`skulbeth/kulworks`). Not on `main` yet, and not live.
Everything in it is described in `docs/SESSION-2026-10-27.md`. This file is the deploy
procedure plus what is still open.

## Why it was not deployed from the laptop

The code needs three new database columns. If `main` is pushed (Vercel auto-deploys
production) before the migration runs, the live quote form and the admin requests page fail
on the missing columns. The laptop could not run the migration: its `.env.local` has blank
secrets, and `vercel env pull` cannot recover them because the database URLs are stored in
Vercel as Sensitive variables, which Vercel never returns. The home PC's `.env.local` has
working `DATABASE_URL` / `DIRECT_URL` (that is where `20261020120000_submission_due_delivery`
was applied from).

## Steps (in this order)

1. **Get the branch onto main locally**
   ```
   git checkout main
   git pull --ff-only origin main
   git fetch origin
   git merge --ff-only origin/deploy-2026-10-27
   ```
   If the fast-forward refuses, main moved at home since 2026-10-27: merge normally, keep both
   sides, and re-check the files listed in the session log.

2. **Install and build**
   ```
   npm install
   npx prisma generate      # stop any running dev server first, or it fails with EPERM on the query engine dll
   npx tsc --noEmit
   npm run build
   ```

3. **Apply the migration to the live database (before pushing main)**
   ```
   npm run db:deploy
   ```
   Expect: `Applying migration 20261027120000_super_rush_and_ship_country` and
   `All migrations have been successfully applied.` It only adds columns:
   - `Submission.superRush BOOLEAN NOT NULL DEFAULT false`
   - `Submission.shipCountry TEXT`
   - `Project.shipCountry TEXT`

   Existing rows are untouched. If it errors, stop here and do not push main.

4. **Deploy**
   ```
   git push origin main
   ```
   Vercel builds and deploys production. Then delete the handoff branch:
   `git push origin --delete deploy-2026-10-27`.

## Check the live site after Vercel finishes

- **Home** (kulworks.com): headline "Your game on the table this week.*" with the footnote
  under the buttons; the strip "About 2 days to ship · Runs of about 120 cards · No minimum";
  "Five crafts, one shop. Games first."; the "Why we cost a little more" band.
- **/pricing/**: intro and "Why we cost a little more" side by side, then the calculator.
  - One poker deck = $41.20. Today's date as the due date shows "That's tight..." and still
    $41.20. Ticking Super rush makes it $66.20 with a "Super rush (front of the queue)" row.
  - "What is this?" next to Setup fee opens a popup starting "TLDR: You're paying for our
    expertise and knowledge, and for the time and wear on the printer." Any tap closes it.
  - "Where is it going?": US + a ZIP shows "usually under $15"; Canada or Mexico "about $25";
    "Somewhere else" shows the can-only-ship note. Shipping is never added to the total.
    "Why this?" opens the shipping popup.
  - "How your order ships" section with the two packaging photos, under the calculator.
- **/contact/**: "Request this estimate" from the calculator arrives with Shipped selected,
  the country and ZIP filled in, and Super rush ticked if it was ticked. The address has a
  country picker (US, Canada, Mexico).
- **Send one real test quote** with Super rush ticked and a Canadian address. Check the
  notification email shows `SUPER RUSH: yes` and the address ends in `Canada`, and the admin
  requests page shows the SUPER RUSH badge. Archive the test request afterwards.

## Still open

- **Tarot boxes and sleeves** still use poker prices when tarot is picked. Sam has not decided
  whether tarot should cost more (from the 2026-10-25 session).
- **Live shipping rates**: deliberately not built. Pirate Ship has no official API. If real
  per-ZIP prices are wanted later, Shippo or EasyPost (rate lookups only; labels stay on
  Pirate Ship). The current estimate is the fixed text in `SHIP_COUNTRIES`
  (`src/lib/order-details.ts`).
- **Home rows at 1024px wide**: the first row is 26px taller than the second (the copy wraps
  more). Matches at wider screens.
- **Work laptop setup**: its `.env.local` has blank secrets (now rewritten by `vercel link`,
  still blank). To run the site there, copy the values over from the home PC by hand.
  `GOOGLE_CALENDAR_ID` was also missing there.
- **ESLint** has no config in this repo (ESLint 9 wants `eslint.config.js`), so `npx eslint`
  fails; `npm run build` and `tsc` are the checks that work.
