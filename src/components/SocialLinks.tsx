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
};

/** Footer social row. Shows every platform in site.social; placeholder links
 *  (handle not yet set) still render so you have the visual slot to fill. */
export default function SocialLinks({ className = "" }: { className?: string }) {
  return (
    <ul className={`flex items-center gap-3 ${className}`}>
      {site.social.map((s) => {
        const isPlaceholder = s.url.includes("REPLACE_WITH_HANDLE");
        const inner = (
          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden>
            {icons[s.name]}
          </svg>
        );
        return (
          <li key={s.name}>
            {isPlaceholder ? (
              // Handle not set yet — show the slot but DON'T render a live (broken) link.
              <span
                aria-label={`${s.name} (add your handle)`}
                title={`${s.name}: add your handle in src/data/site.ts`}
                className="flex h-9 w-9 cursor-not-allowed items-center justify-center rounded-full border border-border bg-surface text-muted opacity-40"
              >
                {inner}
              </span>
            ) : (
              <a
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={s.name}
                title={s.name}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface text-muted transition-colors hover:border-blue hover:text-blue"
              >
                {inner}
              </a>
            )}
          </li>
        );
      })}
    </ul>
  );
}
