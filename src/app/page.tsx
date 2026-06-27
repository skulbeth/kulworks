import Container from "@/components/Container";
import Button from "@/components/Button";
import SectionHeading from "@/components/SectionHeading";
import ServiceCard from "@/components/ServiceCard";
import AudienceCard from "@/components/AudienceCard";
import RevealOnScroll from "@/components/RevealOnScroll";
import Placeholder from "@/components/Placeholder";
import Carousel from "@/components/Carousel";
import FaqSection from "@/components/Faq";
import JsonLd from "@/components/JsonLd";
import { faqSchema } from "@/lib/structured-data";
import { services } from "@/data/services";
import { audiences } from "@/data/audiences";

export default function HomePage() {
  const leadFirst = [...services].sort((a, b) => (b.lead ? 1 : 0) - (a.lead ? 1 : 0));
  const audienceHighlights = audiences.slice(0, 6);

  // Swap these for real photos: drop files in /public/images/studio/ and set `src`.
  const studioSlides = [
    { label: "Studio / workshop photo 1" },
    { label: "Studio / workshop photo 2" },
    { label: "Studio / workshop photo 3" },
  ];

  return (
    <>
      {/* ===== Hero ===== */}
      <section className="relative overflow-hidden border-b border-border">
        <div className="pointer-events-none absolute inset-0 bg-gradient-radial from-primary/10 via-transparent to-transparent" />
        <Container className="relative py-20 sm:py-28">
          <div className="animate-fade-up">
            <p className="mb-4 text-sm font-bold uppercase tracking-[0.25em] text-gold">
              Multi-craft maker studio
            </p>
            <h1 className="text-4xl font-extrabold leading-tight sm:text-6xl">
              One studio, many materials.{" "}
              <span className="text-gold text-glow-gold">Cards, tiles, and 3D</span>, designed and made in-house.
            </h1>
            <p className="mt-6 max-w-3xl text-lg text-muted sm:text-xl">
              Kulworks turns your idea into a finished, physical product. We do custom UV
              card printing, UV-printed game tiles, 3D printing, and the design work behind
              all of it.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Button href="/contact/" variant="primary" size="lg">
                Get a Quote
              </Button>
              <Button href="/portfolio/" variant="ghost" size="lg">
                See the Work
              </Button>
            </div>
          </div>
        </Container>
      </section>

      {/* ===== Intro ===== */}
      <section className="border-b border-border">
        <Container className="py-16">
          <RevealOnScroll>
            <div className="grid items-center gap-10 md:grid-cols-[0.85fr_1.15fr]">
              <div>
                <SectionHeading
                  eyebrow="What we do"
                  title="Designed and made under one roof"
                  intro="No outsourcing and no hand-offs. We do the design and the production in-house, across every material we work in. That keeps the quality where we can control it, from a first prototype deck to a finished run of components."
                />
                <div className="mt-6">
                  <Button href="/about/" variant="ghost">About the studio</Button>
                </div>
              </div>
              <Carousel slides={studioSlides} />
            </div>
          </RevealOnScroll>
        </Container>
      </section>

      {/* ===== Services overview ===== */}
      <section className="border-b border-border">
        <Container className="py-16">
          <RevealOnScroll>
            <SectionHeading
              eyebrow="Services"
              title="Five crafts, one point of contact"
              intro="Card printing is what we do most. If it needs designing, printing, or making, there's a good chance we can help."
            />
          </RevealOnScroll>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {leadFirst.map((s) => (
              <ServiceCard key={s.id} service={s} featured={s.lead} />
            ))}
          </div>
          <div className="mt-8">
            <Button href="/services/" variant="ghost">All services in detail →</Button>
          </div>
        </Container>
      </section>

      {/* ===== Who it's for ===== */}
      <section className="border-b border-border bg-surface/30">
        <Container className="py-16">
          <RevealOnScroll>
            <SectionHeading
              eyebrow="Who it's for"
              title="Built for makers, teams, and sellers"
              intro="Game designers, sports clubs, photographers, market-day sellers. If you need it made, you're in the right place."
            />
          </RevealOnScroll>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {audienceHighlights.map((a) => (
              <AudienceCard key={a.title} audience={a} />
            ))}
          </div>
          <div className="mt-8">
            <Button href="/who-its-for/" variant="ghost">See everyone we work with →</Button>
          </div>
        </Container>
      </section>

      {/* ===== Portfolio highlights ===== */}
      <section className="border-b border-border">
        <Container className="py-16">
          <RevealOnScroll>
            <SectionHeading
              eyebrow="Portfolio"
              title="A few highlights"
              intro="Placeholder shots for now. Real photos of the work go here."
            />
          </RevealOnScroll>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <Placeholder label="Custom Poker Deck" />
            <Placeholder label="UV-Printed Tiles" />
            <Placeholder label="Resin Miniature" />
          </div>
          <div className="mt-8">
            <Button href="/portfolio/" variant="ghost">Browse the full gallery →</Button>
          </div>
        </Container>
      </section>

      {/* ===== FAQ (useful content + topical depth for SEO) ===== */}
      <section className="border-b border-border bg-surface/30">
        <Container className="py-16">
          <RevealOnScroll>
            <SectionHeading
              eyebrow="FAQ"
              title="Common questions"
              intro="Quick answers on card printing, sizes, prototypes, and how to get a quote."
              center
            />
          </RevealOnScroll>
          <FaqSection />
        </Container>
        <JsonLd data={faqSchema()} />
      </section>

      {/* ===== Closing CTA ===== */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-gradient-radial from-gold/10 via-transparent to-transparent" />
        <Container className="relative py-20 text-center">
          <h2 className="mx-auto max-w-2xl text-3xl font-extrabold sm:text-4xl">
            Have a project in mind? Let&apos;s make it.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-muted">
            Tell me what you&apos;re building and I&apos;ll get back to you with next steps and a quote.
          </p>
          <div className="mt-8 flex justify-center">
            <Button href="/contact/" variant="gold" size="lg">Start a Project</Button>
          </div>
        </Container>
      </section>
    </>
  );
}
