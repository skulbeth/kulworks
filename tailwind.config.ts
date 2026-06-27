// tailwind.config.ts
// Design tokens ported from the Role to Reign site so the two read as a family:
// dark premium base, gold + blue accents, emerald CTAs, generous rounding, glow shadows.
// All colors are CSS variables (see src/styles/global.css) so you can retheme in one place.
import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        background: "var(--color-background)",
        surface: "var(--color-surface)",
        surface2: "var(--color-surface-2)",
        border: "var(--color-border)",
        foreground: "var(--color-foreground)",
        muted: "var(--color-muted)",
        gold: "var(--color-gold)",
        blue: "var(--color-blue)",
        primary: "var(--color-primary)",
        "primary-hover": "var(--color-primary-hover)",
        secondary: "var(--color-secondary)",
      },
      fontFamily: {
        // Body + UI (rounded, friendly) — the default everywhere.
        sans: ["var(--font-baloo)", "system-ui", "sans-serif"],
        // Brand wordmark only (clean-studio choice).
        display: ["var(--font-dumbledoor)", "serif"],
        // Available for occasional fantasy accents if desired.
        vinque: ["var(--font-vinque)", "serif"],
      },
      borderRadius: {
        lg: "0.5rem",
        xl: "0.75rem",
        "2xl": "1rem",
      },
      boxShadow: {
        glow: "0 0 24px var(--color-primary)",
        "glow-gold": "0 0 24px var(--color-gold)",
        "glow-hover": "0 0 16px var(--color-blue)",
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gold-sheen":
          "linear-gradient(90deg, var(--color-gold), #fde68a, var(--color-gold))",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.6s ease-out both",
      },
    },
  },
  plugins: [],
};

export default config;
