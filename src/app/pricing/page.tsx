import type { Metadata } from "next";
import Container from "@/components/Container";
import SectionHeading from "@/components/SectionHeading";
import Button from "@/components/Button";
import JsonLd from "@/components/JsonLd";
import CardCalculator from "@/components/CardCalculator";
import { pricing, pricingIntro } from "@/data/pricing";
import { breadcrumbSchema } from "@/lib/structured-data";

export const metadata: Metadata = {
  title: "Pricing",
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

      <section className="border-b border-border">
        <Container className="py-16">
          <SectionHeading eyebrow="Pricing" title="What it costs" intro={pricingIntro} />
        </Container>
      </section>

      {/* Card cost estimator */}
      <section className="border-b border-border bg-surface/30">
        <Container className="py-16">
          <SectionHeading
            eyebrow="Estimator"
            title="Estimate your card order"
            intro="A quick ballpark for card printing. Adjust the options to see a live estimate."
          />
          <div className="mt-10">
            <CardCalculator />
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
                    <li key={it.label} className="flex items-baseline justify-between gap-4 py-2.5">
                      <span className="text-muted">{it.label}</span>
                      <span className="shrink-0 font-semibold">{it.price}</span>
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
