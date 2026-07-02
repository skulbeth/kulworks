import Image from "next/image";
import { site } from "@/data/site";
import { services } from "@/data/services";
import { audiences } from "@/data/audiences";
import ThemeToggle from "@/components/ThemeToggle";

/**
 * Temporary "under construction" landing. Shown sitewide while
 * site.constructionMode is true. Intentionally has NO navigation: it is a
 * holding page, not a way into the unfinished site. Flip site.constructionMode
 * to false to restore the full site.
 *
 * Leads with card printing (the flagship), then the other services, then the
 * audiences Kulworks caters to.
 */
export default function ComingSoon() {
  const lead = services.find((s) => s.lead) ?? services[0];
  const others = services.filter((s) => s.id !== lead.id);

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4 py-16 text-center">
      {/* soft gold glow backdrop */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-radial from-gold/10 via-transparent to-transparent" />

      <ThemeToggle className="absolute right-4 top-4 z-10" />


      <div className="relative mx-auto w-full max-w-4xl">
        {/* Logo */}
        <div className="flex items-center justify-center">
          {/* Light theme logo (default) */}
          <Image
            src="/images/kulworks-logo-light-transparent.png"
            alt="Kulworks"
            width={714}
            height={181}
            priority
            className="logo-light h-16 w-auto sm:h-20"
          />
          {/* Dark theme logo (shown when data-theme="dark") */}
          <Image
            src="/images/kulworks-logo-dark.png"
            alt="Kulworks"
            width={3320}
            height={834}
            priority
            className="logo-dark h-16 w-auto sm:h-20"
          />
        </div>

        <p className="mt-5 text-xs font-bold uppercase tracking-[0.25em] text-gold">
          Multi-craft maker studio · San Antonio
        </p>

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

        {/* Flagship: card printing (wide) */}
        <div className="mt-10 rounded-2xl border border-gold/50 bg-surface p-6 text-left sm:p-8">
          <div className="flex items-center gap-3">
            <span className="text-4xl" aria-hidden>{lead.icon}</span>
            <div>
              <span className="inline-block rounded-full bg-gold/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-gold">
                Our flagship
              </span>
              <h2 className="mt-1 text-2xl font-extrabold sm:text-3xl">{lead.name}</h2>
            </div>
          </div>
          <p className="mt-4 text-lg text-muted">{lead.description}</p>
          <p className="mt-3 text-muted">
            Plus custom 3D-printed card boxes and sleeve upgrades, offered in tiers, so your
            deck arrives as a finished product.
          </p>
        </div>

        {/* We also offer */}
        <p className="mt-10 text-xs font-bold uppercase tracking-[0.2em] text-gold">
          We also offer
        </p>
        <div className="mt-4 grid gap-3 text-left sm:grid-cols-2">
          {others.map((s) => (
            <div key={s.id} className="rounded-xl border border-border bg-surface p-4">
              <div className="flex items-center gap-3">
                <span className="text-2xl" aria-hidden>{s.icon}</span>
                <h3 className="font-bold">{s.name}</h3>
              </div>
              <p className="mt-1.5 text-sm text-muted">{s.tagline}</p>
            </div>
          ))}
        </div>

        {/* Who we make for */}
        <p className="mt-10 text-xs font-bold uppercase tracking-[0.2em] text-gold">
          Who we make for
        </p>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {audiences.map((a) => (
            <span
              key={a.title}
              className="rounded-full border border-border bg-surface px-3 py-1.5 text-sm text-muted"
            >
              {a.title}
            </span>
          ))}
        </div>

        {/* Contact (the only outbound action) */}
        <div className="mt-10">
          <p className="text-muted">Want to talk about a project before we launch?</p>
          <a
            href={`mailto:${site.email}`}
            className="mt-3 inline-flex items-center justify-center rounded-full bg-primary px-6 py-3 font-bold text-black transition-all hover:bg-primary-hover hover:shadow-glow"
          >
            Email {site.email}
          </a>
        </div>

        <p className="mt-10 text-sm text-muted/70">Launching soon.</p>
      </div>
    </main>
  );
}
