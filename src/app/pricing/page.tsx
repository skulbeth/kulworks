import type { Metadata } from "next";
import Container from "@/components/Container";
import SectionHeading from "@/components/SectionHeading";
import Button from "@/components/Button";
import JsonLd from "@/components/JsonLd";
import CardCalculator from "@/components/CardCalculator";
import { pricing, pricingIntro } from "@/data/pricing";
import { breadcrumbSchema } from "@/lib/structured-data";

export const metadata: Metadata = {
  title: "Pricing & Card Cost Estimator",
  description:
    "Starting prices for Kulworks card printing, card design, and 3D modeling in San Antonio. Setup fees, per-card rates, and design rates, with final pricing by quote.",
  alternates: { canonical: "/pricing/" },
};

export default function PricingPage() {
  return (
    <>
      <JsonLd
        data={breadcrumbSchema([
          { name: "Home", path: "/" },
          { name: "Pricing", path: "/pricing/" },
        ])}
      />

      {/* Intro and the trade-off side by side, so the estimator is reached quickly. */}
      <section className="border-b border-border">
        <Container className="grid items-start gap-8 py-12 lg:grid-cols-2 lg:gap-12">
          <div>
            <SectionHeading as="h1" eyebrow="Pricing" title="What it costs" intro={pricingIntro} />
            <p className="mt-6 text-lg text-muted">
              The estimator below is for <strong className="text-foreground">card printing only</strong>.
              Everything else (UV-printed tiles, FDM and resin 3D printing, and custom design) is priced
              per project, so reach out for a custom quote.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button href="#estimator" variant="gold" size="lg">Estimate my cards ↓</Button>
              <Button href="/contact/" variant="ghost" size="lg">Get a custom quote</Button>
            </div>
          </div>
          {/* The trade-off, said once and plainly (short version on the home page). */}
          <div className="rounded-2xl border border-gold/40 bg-gold/10 p-6 sm:p-8 lg:mt-8">
            <h2 className="text-xl font-extrabold text-gold sm:text-2xl">Why we cost a little more</h2>
            <p className="mt-3 text-lg text-muted">
              Our per-card price is higher than a big small-run printer&apos;s. What you&apos;re
              paying for is time: a few real sets made now, not a spot in someone&apos;s queue.
              A print-ready run of about 120 cards is ready to ship in about two days, and super
              rush puts yours at the front of the line.
            </p>
            <p className="mt-3 text-lg text-muted">
              Need 500 or more copies and can wait? A manufacturer will beat our price, and
              we&apos;ll tell you so.
            </p>
          </div>
        </Container>
      </section>

      {/* Card cost estimator */}
      <section id="estimator" className="scroll-mt-24 border-b border-border bg-surface/30">
        <Container className="py-12">
          <SectionHeading
            eyebrow="Estimator"
            title="Estimate your card order"
            intro="A quick ballpark for card printing only. Adjust the options to see a live estimate. For tiles, 3D printing, or design work, ask us for a custom quote."
          />
          <div className="mt-10">
            <CardCalculator />
          </div>
        </Container>
      </section>

      {/* How orders ship: Sam's standard packaging, with his own photos. */}
      <section className="border-b border-border">
        <Container className="py-12">
          <div className="grid items-center gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:gap-12">
            <div>
              <p className="mb-2 font-mono text-xs font-semibold uppercase tracking-[0.25em] text-gold">
                Packaging
              </p>
              <h2 className="text-2xl font-extrabold sm:text-3xl">How your order ships</h2>
              <p className="mt-3 text-lg text-muted">
                Standard packaging: your cards go in a small 3D-printed protective cover or a
                small cardboard box, then into a padded envelope.
              </p>
              <p className="mt-3 text-lg text-muted">
                Bought a case, or have cards that need more protection? We can 3D print a case
                for shipping. Add a custom 3D-printed box in the estimator above, or ask in your
                quote.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <figure>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/images/shipping/padded-mailer.webp"
                  alt="A white padded envelope, the standard way Kulworks card orders ship"
                  width={528}
                  height={413}
                  loading="lazy"
                  className="aspect-[4/3] w-full rounded-xl border border-border object-cover"
                />
                <figcaption className="mt-2 text-center text-sm text-muted">Standard: padded envelope</figcaption>
              </figure>
              <figure>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/images/shipping/3d-printed-cases.webp"
                  alt="Two 3D-printed card cases with a raised name on the lid"
                  width={496}
                  height={383}
                  loading="lazy"
                  className="aspect-[4/3] w-full rounded-xl border border-border object-cover"
                />
                <figcaption className="mt-2 text-center text-sm text-muted">3D-printed cases</figcaption>
              </figure>
            </div>
          </div>
        </Container>
      </section>

      <section className="border-b border-border">
        <Container className="py-12">
          <div className="grid gap-6 lg:grid-cols-2">
            {pricing.map((g) => (
              <div key={g.name} className="rounded-2xl border border-border bg-surface p-6 sm:p-8">
                <h2 className="text-xl font-extrabold text-gold">{g.name}</h2>
                {g.intro && <p className="mt-1 text-sm text-muted">{g.intro}</p>}
                <ul className="mt-4 divide-y divide-border">
                  {g.items.map((it) => (
                    <li key={it.label} className="flex flex-wrap items-baseline gap-x-4 gap-y-1 py-2.5">
                      <span className="text-muted">{it.label}</span>
                      <span className="ml-auto font-semibold text-right">{it.price}</span>
                    </li>
                  ))}
                </ul>
                {g.note && <p className="mt-4 text-sm text-muted/80">{g.note}</p>}
              </div>
            ))}
          </div>
        </Container>
      </section>

      <section>
        <Container className="py-16 text-center">
          <h2 className="text-2xl font-extrabold sm:text-3xl">Want an exact quote?</h2>
          <p className="mx-auto mt-3 max-w-xl text-muted">
            Tell us the project, quantity, and sizes and we&apos;ll send a firm price.
          </p>
          <div className="mt-6 flex justify-center">
            <Button href="/contact/" variant="gold" size="lg">Get a Quote</Button>
          </div>
        </Container>
      </section>
    </>
  );
}
