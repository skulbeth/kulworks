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

- [x] **Phone** in `site.ts` (210-570-3328), shown on Contact and in schema.
- [x] **Real emails** (contact@ / quotes@kulworks.com), wired through `site.ts`.
- [ ] **Postal code + geo** in [`src/data/site.ts`](src/data/site.ts): set `address.postalCode`
  (and `streetAddress` only if you have a public storefront), and confirm `geo` lat/long.
  Fills out the LocalBusiness schema for San Antonio search. NAP must stay IDENTICAL
  everywhere online (site, Google, directories).
- [ ] **Connect the contact-form backend** (currently demo mode, won't send). Pick one,
  then it's a drop-in endpoint swap in [`src/components/ContactForm.tsx`](src/components/ContactForm.tsx):
  - **Web3Forms** (recommended): free, unlimited, supports file attachments on the free tier.
  - **Formspree**: free 50/month, no attachments unless paid (Drive-folder opt-in covers files).
  - Google Forms only if you'd drop the custom on-brand form (off-brand Google page).
- [ ] **Social handles**: replace `REPLACE_WITH_HANDLE` in `site.ts` for Instagram,
  YouTube, TikTok (or have Claude drop the icons if you're not using them yet).
- [ ] **OG share image**: add `public/images/og-default.png` (1200x630) for link previews.
- [ ] **Real photos** (see the Content fill-in map below).
- [ ] **Proofread the copy** on every page so it sounds like you.
- [ ] **UV tile pricing**: still "Quote by project" in `pricing.ts`. Set it cost-plus
  (your material + time) when ready.

---

## 1b. Content fill-in map (where everything lives)

The site is data-driven, so you rarely touch component code. To fill things in:

- **Services** (names, taglines, descriptions, bullet highlights): [`src/data/services.ts`](src/data/services.ts)
- **Card pages** (poker, tarot, giant, prototypes, trading, boxes, card-design): [`src/data/cardCluster.ts`](src/data/cardCluster.ts)
- **Audiences** ("Who it's for" cards): [`src/data/audiences.ts`](src/data/audiences.ts)
- **Portfolio items** (title, category, image, alt): [`src/data/portfolio.ts`](src/data/portfolio.ts)
- **Guides / articles**: [`src/data/guides.ts`](src/data/guides.ts)
- **FAQ**: [`src/data/faq.ts`](src/data/faq.ts)
- **Pricing**: [`src/data/pricing.ts`](src/data/pricing.ts)
- **Business info, contact, socials, the launch switch**: [`src/data/site.ts`](src/data/site.ts)
- **Page-specific copy** (hero, About story): the matching file under `src/app/`

**Images:** drop files in `public/images/{portfolio/<category>, studio, services, hero}/`,
then set `src` on the data item (portfolio) or pass `src=` to a `<Placeholder>`. Add
`public/images/og-default.png` for share previews.

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

## 5b. Media: photos, gifs, and video (ties into images above)

- [ ] Capture a short **gif or video of each batch of equipment** in action, one per
  section (card printer, UV flatbed for tiles, FDM printers, resin printers, the
  design/Shapr3D workflow). Show the machines actually running.
- [ ] Shoot **example pieces / finished work** for each service to showcase in the
  portfolio and on each service page (printed decks, boxes, tiles, FDM and resin
  prints, models).
- [ ] Get example shots of the **custom 3D-printed card boxes and sleeve tiers**.
- [ ] Drop stills into `public/images/<section>/` and set `src`; gifs/video can go in
  `public/` and be embedded on the relevant section once captured.

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
- [x] Light + dark theme with a toggle (light default, no flash)
- [x] Pricing page with researched rates (card printing, design, 3D, FDM, resin, boxes, sleeves)
- [x] Phone + contact/quotes emails wired through `site.ts`
- [x] Guides + FAQ merged into one page; nav trimmed to 6
- [x] Card-printing content cluster (hub + 7 sub-pages) and Card Design (Dextrous) page
- [x] Favicon, skip-to-content link, San Antonio in hero, About refreshed
- [x] Mobile-responsive, semantic HTML, image alt text, scannable service bullets
