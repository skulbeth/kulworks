import { site } from "@/data/site";

// Inline SVG icons (no external requests). Add a platform here + in site.social.
const icons: Record<string, React.ReactNode> = {
  Instagram: (
    <path d="M12 2c2.7 0 3 0 4.1.06 1.1.05 1.8.24 2.4.5.7.27 1.2.63 1.8 1.2.6.6.95 1.1 1.2 1.8.26.6.45 1.3.5 2.4.06 1.1.06 1.4.06 4.1s0 3-.06 4.1c-.05 1.1-.24 1.8-.5 2.4a4.9 4.9 0 0 1-1.2 1.8c-.6.6-1.1.95-1.8 1.2-.6.26-1.3.45-2.4.5-1.1.06-1.4.06-4.1.06s-3 0-4.1-.06c-1.1-.05-1.8-.24-2.4-.5a4.9 4.9 0 0 1-1.8-1.2 4.9 4.9 0 0 1-1.2-1.8c-.26-.6-.45-1.3-.5-2.4C2 15 2 14.7 2 12s0-3 .06-4.1c.05-1.1.24-1.8.5-2.4A4.9 4.9 0 0 1 3.76 3.7c.6-.6 1.1-.95 1.8-1.2.6-.26 1.3-.45 2.4-.5C9 2 9.3 2 12 2Zm0 1.8c-2.65 0-2.96 0-4 .06-.84.04-1.3.18-1.6.3-.4.16-.7.35-1 .65-.3.3-.5.6-.65 1-.12.3-.26.76-.3 1.6-.05 1.04-.06 1.35-.06 4s0 2.96.06 4c.04.84.18 1.3.3 1.6.16.4.35.7.65 1 .3.3.6.5 1 .65.3.12.76.26 1.6.3 1.04.05 1.35.06 4 .06s2.96 0 4-.06c.84-.04 1.3-.18 1.6-.3.4-.16.7-.35 1-.65.3-.3.5-.6.65-1 .12-.3.26-.76.3-1.6.05-1.04.06-1.35.06-4s0-2.96-.06-4c-.04-.84-.18-1.3-.3-1.6a2.7 2.7 0 0 0-.65-1c-.3-.3-.6-.5-1-.65-.3-.12-.76-.26-1.6-.3-1.04-.05-1.35-.06-4-.06Zm0 3.05a5.15 5.15 0 1 1 0 10.3 5.15 5.15 0 0 1 0-10.3Zm0 1.8a3.35 3.35 0 1 0 0 6.7 3.35 3.35 0 0 0 0-6.7Zm5.35-.7a1.2 1.2 0 1 1 0 2.4 1.2 1.2 0 0 1 0-2.4Z" />
  ),
  YouTube: (
    <path d="M23.5 6.5a3 3 0 0 0-2.1-2.1C19.6 4 12 4 12 4s-7.6 0-9.4.4A3 3 0 0 0 .5 6.5C.1 8.3.1 12 .1 12s0 3.7.4 5.5a3 3 0 0 0 2.1 2.1C4.4 20 12 20 12 20s7.6 0 9.4-.4a3 3 0 0 0 2.1-2.1c.4-1.8.4-5.5.4-5.5s0-3.7-.4-5.5ZM9.6 15.5v-7l6.3 3.5-6.3 3.5Z" />
  ),
  TikTok: (
    <path d="M16.5 2c.3 2.3 1.6 3.9 3.8 4.2v2.7c-1.3.1-2.5-.3-3.8-1v5.9c0 3.5-2.5 6.2-5.8 6.2A5.7 5.7 0 0 1 5 14.4c0-3.3 2.9-5.9 6.4-5.3v2.9c-.4-.1-.8-.2-1.2-.2-1.4 0-2.5 1.1-2.5 2.6 0 1.5 1.1 2.6 2.5 2.6 1.5 0 2.6-1.2 2.6-2.9V2h3.7Z" />
  ),
  Facebook: (
    <path d="M22 12a10 10 0 1 0-11.6 9.9v-7H7.9V12h2.5V9.8c0-2.5 1.5-3.9 3.8-3.9 1.1 0 2.2.2 2.2.2v2.4h-1.2c-1.2 0-1.6.8-1.6 1.5V12h2.7l-.4 2.9h-2.3v7A10 10 0 0 0 22 12Z" />
  ),
};

// Brand fills for the colored variant (Instagram uses a gradient defined once below).
const BRAND: Record<string, string> = {
  Instagram: "url(#kw-ig-grad)",
  YouTube: "#FF0000",
  Facebook: "#1877F2",
  TikTok: "#010101",
};

/** Social row with brand-colored icons (Instagram gradient, YouTube red, etc.).
 *  Renders nothing until at least one real handle is set in site.social. */
export default function SocialLinks({ className = "" }: { className?: string }) {
  const reals = site.social.filter((s) => !s.url.includes("REPLACE_WITH_HANDLE"));
  if (reals.length === 0) return null;

  return (
    <ul className={`flex items-center gap-2.5 ${className}`}>
      <svg width="0" height="0" aria-hidden className="absolute h-0 w-0">
        <defs>
          <linearGradient id="kw-ig-grad" x1="0" y1="1" x2="1" y2="0">
            <stop offset="0" stopColor="#FEDA75" />
            <stop offset=".25" stopColor="#FA7E1E" />
            <stop offset=".5" stopColor="#D62976" />
            <stop offset=".75" stopColor="#962FBF" />
            <stop offset="1" stopColor="#4F5BD5" />
          </linearGradient>
        </defs>
      </svg>
      {reals.map((s) => (
        <li key={s.name}>
          <a
            href={s.url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={s.name}
            title={s.name}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface transition-transform hover:-translate-y-0.5 hover:border-blue"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill={BRAND[s.name] ?? "currentColor"} aria-hidden>
              {icons[s.name]}
            </svg>
          </a>
        </li>
      ))}
    </ul>
  );
}
