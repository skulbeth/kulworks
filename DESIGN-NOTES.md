# Kulworks Design System

Extracted from the **Role to Reign** website (`globals.css`, `tailwind.config.ts`,
`layout.tsx`) so the two read as a family. Kulworks is the company-first sibling:
same dark/gold/blue mood, but the fantasy display fonts are dialed back to the
**wordmark only** so it reads as a credible maker studio rather than a game.

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
| `background` | `#faf9f7` | `#0b0b0b` | Page base |
| `surface` | `#ffffff` | `#161616` | Cards / panels |
| `surface2` | `#f1efe9` | `#1f1f1f` | Raised cards, inputs |
| `border` | `#e5e2da` | `#2d2d2d` | Hairline borders |
| `foreground` | `#1b1b1b` | `#ffffff` | Primary text |
| `muted` | `#4b5563` | `#cbd5e1` | Secondary text |
| `gold` | `#b45309` | `#fcd34d` | Signature highlight (deep amber on light so it reads on white) |
| `blue` | `#2563eb` | `#93c5fd` | Links, subheads, active nav |
| `primary` | `#10b981` | `#10b981` | CTA fill (emerald, same in both) |
| `primary-hover` | `#059669` | `#34d399` | CTA hover |
| `secondary` | `#047857` | `#059669` | Emerald accent |

Signature combo: **gold + blue accents with emerald for action**, on a light or
near-black base depending on theme.

## Typography

| Role | Font | Where |
|---|---|---|
| Wordmark | **Dumbledoor** (`fonts/dum1.ttf`) | "Kulworks" logo in header/footer only (`font-display`) |
| Body + UI | **Baloo 2** (Google) | Everything (`font-sans`, the default) |
| Fantasy accent | **Vinque** (`fonts/vinque.otf`) | Available via `font-vinque`; used sparingly / optional |

Fonts load through `next/font` in `src/app/layout.tsx` (no network for the local ones).

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
