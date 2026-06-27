import type { Metadata } from "next";
import Link from "next/link";
import Container from "@/components/Container";
import SectionHeading from "@/components/SectionHeading";
import JsonLd from "@/components/JsonLd";
import CardDesignPromo from "@/components/CardDesignPromo";
import FaqSection from "@/components/Faq";
import { guides } from "@/data/guides";
import { breadcrumbSchema, faqSchema } from "@/lib/structured-data";

export const metadata: Metadata = {
  title: "Guides & FAQ",
  description:
    "Guides and frequently asked questions on custom card printing: card sizes, prepping art for print, prototyping, pricing, and getting your deck made.",
  alternates: { canonical: "/guides/" },
};

export default function GuidesPage() {
  return (
    <>
      <JsonLd
        data={breadcrumbSchema([
          { name: "Home", path: "/" },
          { name: "Guides & FAQ", path: "/guides/" },
        ])}
      />
      <JsonLd data={faqSchema()} />

      <section className="border-b border-border">
        <Container className="py-16">
          <SectionHeading
            eyebrow="Guides & FAQ"
            title="Guides and answers"
            intro="Practical guides plus quick answers to the questions we hear most, from card sizes to getting your art print-ready."
          />
        </Container>
      </section>

      <section className="border-b border-border">
        <Container className="py-12">
          <Link
            href="/pricing/"
            className="group mb-6 flex flex-col items-start justify-between gap-3 rounded-2xl border border-gold/40 bg-gold/5 p-6 transition-all hover:-translate-y-1 hover:border-gold sm:flex-row sm:items-center"
          >
            <div>
              <h2 className="text-xl font-bold text-gold">Looking for prices?</h2>
              <p className="mt-1 text-muted">
                See starting prices for card printing, design, and 3D modeling.
              </p>
            </div>
            <span className="shrink-0 font-bold text-gold">View pricing →</span>
          </Link>

          <div className="grid gap-6 sm:grid-cols-2">
            {guides.map((g) => (
              <Link
                key={g.slug}
                href={`/guides/${g.slug}/`}
                className="group flex h-full flex-col rounded-2xl border border-border bg-surface p-6 transition-all duration-300 hover:-translate-y-1 hover:border-blue/50 hover:shadow-glow-hover"
              >
                <p className="text-xs font-semibold uppercase tracking-wider text-muted">
                  {g.readMinutes} min read
                </p>
                <h2 className="mt-2 text-xl font-bold">{g.title}</h2>
                <p className="mt-2 flex-1 text-muted">{g.description}</p>
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-blue transition-transform group-hover:gap-2">
                  Read it →
                </span>
              </Link>
            ))}
          </div>
        </Container>
      </section>

      {/* FAQ (merged in from the old standalone page) */}
      <section id="faq" className="border-b border-border bg-surface/30 scroll-mt-20">
        <Container className="py-16">
          <SectionHeading
            eyebrow="FAQ"
            title="Frequently asked questions"
            intro="Card printing, sizes, design, prototypes, files, and how to get a quote."
          />
          <FaqSection />
        </Container>
      </section>

      <CardDesignPromo />
    </>
  );
}
