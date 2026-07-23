import type { Metadata } from "next";
import Container from "@/components/Container";
import Button from "@/components/Button";
import SectionHeading from "@/components/SectionHeading";
import JsonLd from "@/components/JsonLd";
import CardPrintingAccordion from "@/components/CardPrintingAccordion";
import { cardHub } from "@/data/cardCluster";
import { cardHubServiceSchema, breadcrumbSchema } from "@/lib/structured-data";

export const metadata: Metadata = {
  title: cardHub.title,
  description: cardHub.metaDescription,
  alternates: { canonical: "/services/card-printing/" },
};

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
            Need a size you don&apos;t see here? We also print{" "}
            <span className="text-foreground">tarot cards</span> and{" "}
            <span className="text-foreground">giant and jumbo cards</span> on custom order.{" "}
            <a href="/contact/?type=card-printing" className="font-semibold text-blue hover:underline">
              Just ask
            </a>{" "}
            and we&apos;ll quote it.
          </p>
        </Container>
      </section>

      <section>
        <Container className="py-16 text-center">
          <h2 className="text-2xl font-extrabold sm:text-3xl">Ready to print your cards?</h2>
          <p className="mx-auto mt-3 max-w-xl text-muted">
            Tell me about your deck and I&apos;ll come back with options and a quote.
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
