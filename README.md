# Kulworks

Marketing + portfolio website for **Kulworks**, a multi-craft maker studio
(custom card printing, UV-printed board game tiles, FDM & resin 3D printing, and
3D modeling/design).

Built with **Next.js (App Router) + Tailwind CSS**, configured for **static export**
so it hosts anywhere (Netlify, Vercel, GitHub Pages, S3, …). The design system is
ported from the Role to Reign site. See [`DESIGN-NOTES.md`](DESIGN-NOTES.md).

## Run it locally

```bash
npm install
npm run dev
```

Then open <http://localhost:3002> (dev server runs on port 3002).

To produce the static site:

```bash
npm run build      # outputs the static site to ./out
```

## Project structure

```
kulworks/
├─ DESIGN-NOTES.md          # the extracted design system
├─ next.config.mjs          # static export config (output: "export")
├─ tailwind.config.ts       # design tokens mapped to Tailwind
├─ fonts/                   # Dumbledoor + Vinque (copied from Role to Reign)
├─ public/images/           # swappable images (see below)
│  ├─ hero/  services/  portfolio/
└─ src/
   ├─ styles/global.css     # CSS-variable design tokens (retheme here)
   ├─ app/                  # pages (App Router)
   │  ├─ layout.tsx         # fonts, SEO/OG, header + footer
   │  ├─ page.tsx           # Home
   │  ├─ services/  portfolio/  who-its-for/  about/  contact/
   ├─ components/           # Header, Footer, Button, ServiceCard, PortfolioGrid, ContactForm, …
   └─ data/                 # services.ts, audiences.ts, portfolio.ts  ← edit content here
```

## Edit the content (no component-diving needed)

Most copy/content is data-driven:

- **Services**: `src/data/services.ts`. Editing this updates the home grid, the
  Services page, the "Request this" CTAs, *and* the contact form's dropdown.
- **Who It's For**: `src/data/audiences.ts`.
- **Portfolio**: `src/data/portfolio.ts`. Each item has a `category` (drives the
  filter) and an optional `src`.

Page-specific copy (hero text, About story) lives in the matching file under `src/app/`.

## Swap in your own images

Image spots render an **obvious labeled placeholder** until you provide a real file.

1. Drop your image in `public/images/portfolio/` (or `hero/`, `services/`).
   Suggested naming: `cards-01.jpg`, `tiles-01.jpg`, `resin-01.jpg`, etc.
2. Point to it:
   - **Portfolio:** set `src: "/images/portfolio/cards-01.jpg"` on the item in `src/data/portfolio.ts`.
   - **Page placeholders** (hero/about/services): replace `<Placeholder label="…" />`
     with `<Placeholder label="…" src="/images/hero/your-file.jpg" />`.
3. Add a social share image at `public/images/og-default.png` (1200×630) for nice link previews.

The `<Placeholder>` component (`src/components/Placeholder.tsx`) renders an `<img>`
when `src` is set and the labeled box otherwise, so the site always looks finished.

## Hook up the contact form (Formspree)

The form posts client-side to **Formspree** (works on any static host).

1. Create a form at <https://formspree.io> and copy its endpoint.
2. Open `src/components/ContactForm.tsx` and replace the placeholder:
   ```ts
   const FORMSPREE_ENDPOINT = "https://formspree.io/f/REPLACE_WITH_YOUR_FORM_ID";
   ```
   Until you do, the form runs in **demo mode** (shows success, sends nothing).

Also update the placeholder contact details (search for `hello@kulworks.com`) in
`ContactForm.tsx`, `Footer.tsx`, and `src/app/contact/page.tsx`.

> Prefer **Netlify Forms** instead? Add `data-netlify="true"` and a hidden
> `form-name` field to the `<form>` and host on Netlify, then the JS fetch can be removed.

## Deploy

The build outputs a fully static site to `./out`.

- **Vercel:** import the repo and it detects Next.js automatically. (Or deploy `out/` as static.)
- **Netlify:** build command `npm run build`, publish directory `out`.
- **GitHub Pages:** push `out/` to your Pages branch/host. `trailingSlash` is already
  enabled in `next.config.mjs` for clean Pages URLs. If serving from a subpath
  (e.g. `username.github.io/kulworks`), set `basePath`/`assetPrefix` in `next.config.mjs`.

## Notes

- Fully responsive (mobile-first), semantic HTML, keyboard-navigable, alt text on images,
  and `prefers-reduced-motion` respected.
- Retheme the whole site from `src/styles/global.css`. See `DESIGN-NOTES.md`.
