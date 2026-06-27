import type { Metadata } from "next";
import Link from "next/link";
import Container from "@/components/Container";
import Button from "@/components/Button";
import SectionHeading from "@/components/SectionHeading";
import JsonLd from "@/components/JsonLd";
import { cardHub, cardPages } from "@/data/cardCluster";
import { cardHubServiceSchema, breadcrumbSchema } from "@/lib/structured-data";

// Hub grouping. Reorder slugs (or move them between groups) to restructure.
const HUB_GROUPS = [
  {
    key: "design",
    title: "Design & Fast Prototyping",
    intro: "What we do best: fast card design and local prototypes.",
    slugs: ["card-design", "game-prototypes"],
  },
  {
    key: "sizes",
    title: "Card Sizes Offered",
    intro: "Pick the size that fits your deck.",
    slugs: ["poker-cards", "tarot-cards", "giant-cards", "trading-cards"],
  },
  {
    key: "upgrades",
    title: "Upgrades Offered",
    intro: "Finish the deck with boxes, sleeves, and other extras.",
    slugs: ["boxes-and-upgrades"],
  },
];

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
          <SectionHeading eyebrow={cardHub.eyebrow} title={cardHub.h1} intro={cardHub.intro} />
        </Container>
      </section>

      <section className="border-b border-border">
        <Container className="py-12">
          {HUB_GROUPS.map((g, gi) => {
            const items = g.slugs
              .map((slug) => cardPages.find((p) => p.slug === slug))
              .filter((p): p is (typeof cardPages)[number] => Boolean(p));
            if (!items.length) return null;
            return (
              <div key={g.key} className={gi > 0 ? "mt-10 border-t-2 border-gold/40 pt-10" : ""}>
                <h2 className="text-2xl font-extrabold text-gold text-glow-gold">{g.title}</h2>
                <p className="mt-1 text-muted">{g.intro}</p>
                <div className="mt-6 grid gap-6 sm:grid-cols-2">
                  {items.map((p) => (
                    <Link
                      key={p.slug}
                      href={`/services/card-printing/${p.slug}/`}
                      className="group flex h-full flex-col rounded-2xl border border-border bg-surface p-6 transition-all duration-300 hover:-translate-y-1 hover:border-blue/50 hover:shadow-glow-hover"
                    >
                      <h3 className="text-xl font-bold">{p.navLabel}</h3>
                      <p className="mt-2 flex-1 text-muted">{p.cardBlurb}</p>
                      <span className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-blue transition-transform group-hover:gap-2">
                        Learn more →
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
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
