# Kulworks Design System

Kulworks started from the **Role to Reign** tokens and kept the family thread
(brass + blue, dark base, generous rounding). The palette has since been
**sampled from actual Kulworks work** rather than from framework defaults, and
the type is set for a shop whose money is in 3D design.

**Where the colors come from** — pulled off the photos in
`public/images/portfolio/`:

| Sampled | From | Becomes |
|---|---|---|
| `#a8d13f` lime | the award filament | `primary` — the CTA color |
| `#0d1220` ink | the dark squares of the UV-printed board panels | dark `background` |
| `#0f5aa8` signal blue | the printed card backs and boards | `blue` — links, subheads |
| `#9a5b0b` brass | the gold linework on the boards | `gold` — the Role to Reign thread |

The reasoning: the brightest thing in the shop is the filament, so it is the
brightest thing on the screen. Emerald CTAs and a neutral black were doing the
same jobs before, but they came from a framework, not from the bench.

All tokens live as CSS variables in [`src/styles/global.css`](src/styles/global.css)
and are mapped to Tailwind in [`tailwind.config.ts`](tailwind.config.ts). Change a
value once and it updates everywhere.

## Themes (light default + dark)

The site ships with **two themes**, switched by a toggle in the header (and on the
construction landing). **Light is the default** (`:root`); **dark is opt-in** via
`<html data-theme="dark">` (the original Role to Reign look). The choice is saved to
`localStorage('theme')` and applied before paint by an inline script in `layout.tsx`,
so there is no flash. Accents shift between themes so contrast stays readable.

## Colors

| Token | Light (default) | Dark | Use |
|---|---|---|---|
| `background` | `#f6f5f2` | `#0d1220` | Page base (paper / ink) |
| `surface` | `#ffffff` | `#141a2b` | Cards / panels |
| `surface2` | `#ebe9e3` | `#1c2338` | Raised cards, inputs |
| `border` | `#dedad1` | `#2b3348` | Hairline borders |
| `foreground` | `#141a2b` | `#f2f4f9` | Primary text |
| `muted` | `#4c5468` | `#a9b3c7` | Secondary text |
| `gold` | `#9a5b0b` | `#d2b46a` | Brass highlight, eyebrows |
| `gold-sheen` | `#d98f26` | `#f0dca6` | Lighter stop in `.text-gold-sheen` |
| `blue` | `#0f5aa8` | `#7fb2f0` | Links, subheads, active nav |
| `primary` | `#a8d13f` | `#b6e04e` | CTA fill (always with black text) |
| `primary-hover` | `#95bd31` | `#c6ec66` | CTA hover |
| `secondary` | `#5a7315` | `#8fbb2f` | Deep lime for text-weight accents |

Signature combo: **brass + signal blue on paper or ink, with filament lime for
action.**

**Contrast:** every text pairing above clears WCAG AA (4.5:1) against its own
theme's background *and* against `surface`. The two that need watching if you
retune them:

- `gold` on light is a **bronze, not a yellow** — darkening the sampled brass far
  enough to pass AA turns it olive next to the lime, so it warms toward amber
  instead. `#9a5b0b` sits at 5.0:1 on paper, 5.4:1 on white.
- `primary` is only ever a **fill with black text** (11.9:1) — it is never used as
  text and would fail if it were. Keep it that way.

## Typography

| Role | Font | Where |
|---|---|---|
| Headings | **Familjen Grotesk** (Google) | `h1`–`h4` everywhere, via a base rule in `global.css` — pages need no markup changes (`font-display`) |
| Body + UI | **IBM Plex Sans** (Google) | Everything else (`font-sans`, the default) |
| Measured things | **IBM Plex Mono** (Google) | Section eyebrows, estimator figures, table numbers (`font-mono`) |
| Wordmark | **Dumbledoor** (`fonts/dum1.ttf`) | "Kulworks" logo only (`font-wordmark`) |
| Fantasy accent | **Vinque** (`fonts/vinque.otf`) | Available via `font-vinque`; used sparingly / optional |

Fonts load through `next/font` in `src/app/layout.tsx` (no network for the local ones).

**Why this pairing.** Familjen Grotesk is a clean grotesque with no mannerism to
tire of, and it runs narrow — headlines here wrap to two or three lines, so that
buys back a line. (Space Grotesk was tried first and rejected: its single-storey
`a` and curled `g` get noticed once and then never stop being noticed.) Plex Sans
carries the long guide and service pages without fatigue. Plex Mono is the character move: a shop that works to a
thousandth of an inch sets its numbers like it, so specs, quantities, prices and
the small uppercase eyebrows are all mono.

Two mechanical notes:

- Pages ask for `font-extrabold` (800); Familjen Grotesk stops at 700, so
  `font-synthesis-weight: none` on headings keeps the browser from faking a
  heavier weight by smearing the outlines.
- Headings get `letter-spacing: -0.015em` — the display face sets loose at large
  sizes.

## Shape, shadow, motion

- **Radius:** generous. `rounded-xl`/`rounded-2xl` on cards, **`rounded-full` pills** for buttons.
- **Shadows:** `shadow-lg` baseline; signature glows `shadow-glow` (emerald),
  `shadow-glow-gold`, `shadow-glow-hover` (blue); gold text-glow via `.text-glow-gold`.
- **Motion:** subtle only. Hover lift on cards, `animate-fade-up` on the hero,
  and `RevealOnScroll` (IntersectionObserver) for gentle fade/slide as sections enter.
  All motion respects `prefers-reduced-motion` (see `global.css`).

## Buttons (`src/components/Button.tsx`)

- `primary`: emerald fill, black text (main CTA, e.g. "Get a Quote").
- `gold`: gold fill, black text (closing CTAs).
- `ghost`: outlined, hover to blue (secondary actions).

## Mood

Dark, premium, confident, maker-credible. Friendly rounded type (Baloo) keeps it warm;
gold + blue accents keep it tied to Role to Reign without leaning fantasy.

## Retheme in one place

Edit the variables in `src/styles/global.css`. For example, to shift the accent from
emerald to orange, change `--color-primary` / `--color-primary-hover` / `--color-secondary`.
Nothing else needs to change.
