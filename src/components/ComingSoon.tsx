import { site } from "@/data/site";
import { services } from "@/data/services";

/**
 * Temporary "under construction" landing. Shown sitewide while
 * site.constructionMode is true. Intentionally has NO navigation: it is a
 * holding page, not a way into the unfinished site. Flip site.constructionMode
 * to false to restore the full site.
 */
export default function ComingSoon() {
  const leadFirst = [...services].sort((a, b) => (b.lead ? 1 : 0) - (a.lead ? 1 : 0));

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4 py-16 text-center">
      {/* soft gold glow backdrop */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-radial from-gold/10 via-transparent to-transparent" />

      <div className="relative mx-auto w-full max-w-3xl">
        {/* Wordmark */}
        <div className="flex items-center justify-center gap-2 text-gold">
          <svg
            viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor"
            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden
          >
            <path d="M3 10.5 12 3l9 7.5" />
            <path d="M5 9.5V21h14V9.5" />
            <path d="M9.5 21v-6h5v6" />
          </svg>
          <span className="font-display text-4xl tracking-wide text-glow-gold sm:text-5xl">
            Kulworks
          </span>
        </div>

        <p className="mt-5 text-xs font-bold uppercase tracking-[0.25em] text-gold">
          Multi-craft maker studio · San Antonio
        </p>

        {/* Under construction badge */}
        <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-gold/40 bg-gold/10 px-4 py-1.5 text-sm font-bold text-gold">
          <span aria-hidden>🚧</span> Site under construction
        </div>

        <h1 className="mt-6 text-3xl font-extrabold leading-tight sm:text-5xl">
          One studio, many materials.{" "}
          <span className="text-gold text-glow-gold">Cards, tiles, and 3D</span>, designed and made in-house.
        </h1>

        <p className="mx-auto mt-5 max-w-xl text-lg text-muted">
          We&apos;re building our new home on the web. Here&apos;s what Kulworks will offer.
        </p>

        {/* What we'll offer (no links) */}
        <div className="mx-auto mt-10 grid gap-4 text-left sm:grid-cols-2">
          {leadFirst.map((s) => (
            <div
              key={s.id}
              className={`rounded-2xl border bg-surface p-5 ${
                s.lead ? "border-gold/50" : "border-border"
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl" aria-hidden>{s.icon}</span>
                <h2 className="font-bold">{s.name}</h2>
                {s.lead && (
                  <span className="ml-auto rounded-full bg-gold/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-gold">
                    Lead
                  </span>
                )}
              </div>
              <p className="mt-2 text-sm text-muted">{s.tagline}</p>
            </div>
          ))}
        </div>

        {/* Contact (the only outbound action) */}
        <div className="mt-10">
          <p className="text-muted">Want to talk about a project before we launch?</p>
          <a
            href={`mailto:${site.quotesEmail}`}
            className="mt-3 inline-flex items-center justify-center rounded-full bg-primary px-6 py-3 font-bold text-black transition-all hover:bg-primary-hover hover:shadow-glow"
          >
            Email {site.quotesEmail}
          </a>
        </div>

        <p className="mt-10 text-sm text-muted/70">Launching soon.</p>
      </div>
    </main>
  );
}
