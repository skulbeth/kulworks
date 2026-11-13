import type { Metadata } from "next";
import Container from "@/components/Container";
import Button from "@/components/Button";
import SectionHeading from "@/components/SectionHeading";
import JsonLd from "@/components/JsonLd";
import CardPrintingAccordion from "@/components/CardPrintingAccordion";
import { cardHub } from "@/data/cardCluster";
import { cardSpecs } from "@/data/cardSpecs";
import { cardHubServiceSchema, breadcrumbSchema } from "@/lib/structured-data";
import { withSocial } from "@/lib/page-meta";

export const metadata: Metadata = withSocial({
  title: cardHub.title,
  description: cardHub.metaDescription,
  alternates: { canonical: "/services/card-printing/" },
});

export default function CardPrintingHub() {
  return (
    <>
      <JsonLd data={cardHubServiceSchema()} />
      <JsonLd
        data={breadcrumbSchema([
          { name: "Home", path: "/" },
          { name: "Services", path: "/services/" },
          { name: "Card Printing", path: "/services/card-printing/" },
        ])}
      />

      <section className="border-b border-border">
        <Container className="py-16">
          <SectionHeading as="h1" eyebrow={cardHub.eyebrow} title={cardHub.h1} intro={cardHub.intro} />
        </Container>
      </section>

      <section className="border-b border-border">
        <Container className="py-12">
          <CardPrintingAccordion />
          <p className="mt-8 text-sm text-muted">
            Need a size you don&apos;t see here? We print{" "}
            <span className="text-foreground">tarot cards</span> as a standard size ($0.70 a card),
            and{" "}
            <span className="text-foreground">bridge, giant, and jumbo cards</span> on custom order.{" "}
            <a href="/contact/?type=card-printing" className="font-semibold text-blue hover:underline">
              Just ask
            </a>{" "}
            and we&apos;ll quote it.
          </p>
        </Container>
      </section>

      {/* The questions most quote requests ask, answered before they have to. */}
      <section id="what-our-cards-are" className="scroll-mt-24 border-b border-border bg-surface/30">
        <Container className="py-12">
          <SectionHeading
            eyebrow="The details"
            title="What our cards are"
            intro="The straight answers to what people ask most, so you know what you're getting before you ask for a quote."
          />
          <dl className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {cardSpecs.map((s) => (
              <div key={s.label} className="rounded-2xl border border-border bg-surface p-5">
                <dt className="text-sm font-bold uppercase tracking-wide text-gold">{s.label}</dt>
                <dd className="mt-2 text-sm text-muted">{s.body}</dd>
              </div>
            ))}
          </dl>
        </Container>
      </section>

      <section>
        <Container className="py-16 text-center">
          <h2 className="text-2xl font-extrabold sm:text-3xl">Ready to print your cards?</h2>
          <p className="mx-auto mt-3 max-w-xl text-muted">
            Tell us about your deck and we&apos;ll come back with options and a quote.
          </p>
          <div className="mt-6 flex justify-center">
            <Button href="/contact/?type=card-printing" variant="gold" size="lg">
              Get a Quote
            </Button>
          </div>
        </Container>
      </section>
    </>
  );
}
