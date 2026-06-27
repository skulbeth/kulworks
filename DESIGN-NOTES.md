# Kulworks Design System

Extracted from the **Role to Reign** website (`globals.css`, `tailwind.config.ts`,
`layout.tsx`) so the two read as a family. Kulworks is the company-first sibling:
same dark/gold/blue mood, but the fantasy display fonts are dialed back to the
**wordmark only** so it reads as a credible maker studio rather than a game.

All tokens live as CSS variables in [`src/styles/global.css`](src/styles/global.css)
and are mapped to Tailwind in [`tailwind.config.ts`](tailwind.config.ts). Change a
value once and it updates everywhere.

## Colors

| Token | Value | Use |
|---|---|---|
| `background` | `#0b0b0b` | Page base (near-black) |
| `surface` | `#161616` | Cards / panels |
| `surface2` | `#1f1f1f` | Raised cards, inputs |
| `border` | `#2d2d2d` | Hairline borders |
| `foreground` | `#ffffff` | Primary text |
| `muted` | `#cbd5e1` | Secondary text (slate-300) |
| `gold` | `#fcd34d` | Signature highlight (amber-300); glow `rgba(255,182,54,.85)` |
| `blue` | `#93c5fd` | Links, subheads, active nav |
| `primary` | `#10b981` | CTA fill (emerald-500) |
| `primary-hover` | `#34d399` | CTA hover (emerald-400) |
| `secondary` | `#059669` | Emerald-600 |

Signature combo: **gold + blue on near-black**, emerald for action.

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
