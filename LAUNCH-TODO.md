# Kulworks Launch TODO

A running checklist to get the site launch-ready and ranking. Grouped by priority.
Check items off as you go. Most code placeholders live in
[`src/data/site.ts`](src/data/site.ts) and [`src/components/ContactForm.tsx`](src/components/ContactForm.tsx).

---

## 0. Flip the launch switch (when ready)

- [ ] The site is currently in **construction mode**: `constructionMode: true` in
  [`src/data/site.ts`](src/data/site.ts). This shows only the "coming soon" landing
  (no nav) and sets the whole site to **noindex**. The inner pages still work by
  direct URL for previewing.
- [ ] When everything below is done, set `constructionMode: false`, commit, and push.
  That restores the full home page + navigation and makes the site indexable.

## 1. Must-do before launch (blockers)

- [ ] **Fill business details (NAP)** in [`src/data/site.ts`](src/data/site.ts):
  - [ ] `telephone` (E.164 format, e.g. `+1-210-555-0123`)
  - [ ] `address.postalCode` (and `streetAddress` only if you have a public storefront)
  - [ ] Confirm `geo` latitude/longitude match your real location
  - NAP = Name, Address, Phone. Keep these IDENTICAL everywhere online (site, Google,
    directories). Inconsistent NAP is one of the most common local-SEO killers.
- [ ] **Contact form (Formspree)**: create a form at https://formspree.io and paste the
  endpoint into [`src/components/ContactForm.tsx`](src/components/ContactForm.tsx)
  (replace `REPLACE_WITH_YOUR_FORM_ID`). Until then the form is in demo mode.
- [ ] **Real email**: replace `hello@kulworks.com` in `site.ts` (it flows everywhere).
- [ ] **Social handles**: replace `REPLACE_WITH_HANDLE` in `site.ts` for Instagram,
  YouTube, TikTok. Placeholder links show in the footer but are kept out of the
  schema until filled.
- [ ] **OG share image**: add `public/images/og-default.png` (1200x630) so links
  preview nicely on social and in chats.
- [ ] **Real photos**: drop card/print/3D photos into `public/images/portfolio/<category>/`
  and the studio shots into `public/images/studio/`, then set `src` in the data files.
  Good photos help conversions and image search.
- [ ] **Proofread the copy** on every page so it sounds like you.

---

## 2. Google Business Profile (highest-impact local SEO)

This is the single biggest lever for showing up in the San Antonio "map pack." Research
puts it at roughly a third of local ranking weight.

- [ ] **Create the profile**: https://business.google.com
- [ ] Choose **Service-area business** (no public storefront) and set San Antonio +
  surrounding cities (New Braunfels, Schertz, Boerne, etc.) as your service area.
- [ ] Pick the most accurate **primary category** (e.g. "Print shop" or "Commercial
  printer"); add secondary categories (e.g. "3D printing service", "Graphic designer").
- [ ] Enter NAP **exactly** as it appears in `site.ts`.
- [ ] Add your website (`https://kulworks.com`), hours/availability, and a short
  description using your real keywords (custom card printing, San Antonio, etc.).
- [ ] Upload photos (logo, work samples, studio). Refresh them over time.
- [ ] Complete Google's verification (postcard, phone, or video).
- [ ] Add your **Services** in the profile so they match the site.
- [ ] Post updates occasionally (new work, convention appearances).

---

## 3. Reviews (second-biggest local lever)

- [ ] After your first few jobs, ask happy customers to leave a **Google review** on the
  Business Profile (grab your review short-link from the GBP dashboard).
- [ ] Reply to every review, good or bad.
- [ ] Do NOT add review/star markup to the website for reviews of yourself. Google makes
  self-reviews ineligible for star snippets, so reviews should live on your Google
  Business Profile, not in the site's structured data.
- [ ] Optional: once you have genuine reviews, quote a few as plain testimonials on the
  site (as text, without rating schema).

---

## 4. Local citations / directories (NAP consistency)

List the business (same NAP) on the directories that feed local search:

- [ ] Google Business Profile (above)
- [ ] Bing Places
- [ ] Apple Business Connect (Apple Maps)
- [ ] Facebook Page
- [ ] Yelp
- [ ] Local: San Antonio Chamber of Commerce, local maker/biz directories
- [ ] Niche: any board-game/tabletop or maker directories you can find
- [ ] Keep every listing's name, address, and phone identical to `site.ts`.

---

## 5. After launch (submit + measure)

- [ ] **Google Search Console**: add and verify `kulworks.com`, submit
  `https://kulworks.com/sitemap.xml`. (Sitemap and robots.txt are already generated.)
- [ ] **Bing Webmaster Tools**: same, submit the sitemap.
- [ ] (Optional) Analytics: add a privacy-friendly analytics tool to see what converts.
- [ ] Check **Core Web Vitals** / PageSpeed Insights after launch and fix any flags.
- [ ] Watch which queries bring traffic in Search Console; expand content around winners.

---

## 6. Content growth (the big opportunity, ongoing)

The card-printing cluster is scaffolded under `/services/card-printing/` (hub + focused
sub-pages). Keep feeding it:

- [ ] Flesh out each card sub-page with real specs, photos, and examples.
- [ ] Add new sub-pages as you find what people search (e.g. bridge size, giant cards,
  oracle decks, board-game prototype kits).
- [ ] Add short, genuinely useful blog/guide posts (e.g. "How to prep card art for
  printing", "Poker vs tarot card sizes") to capture informational searches.
- [ ] Earn local links: sponsor a game night, partner with a San Antonio game store,
  get listed by conventions you attend.

---

## Already done (for reference)

- [x] Per-page titles, meta descriptions, canonical URLs, Open Graph/Twitter tags
- [x] Structured data (Organization, WebSite, LocalBusiness/ProfessionalService with
  geo + service area, Service, BreadcrumbList, FAQ) via JSON-LD
- [x] `sitemap.xml` and `robots.txt` auto-generated on build
- [x] FAQ section with real Q&A (content depth)
- [x] Mobile-responsive, semantic HTML, image alt text
- [x] Card-printing content cluster scaffolding
