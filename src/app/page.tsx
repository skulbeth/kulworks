import Link from "next/link";
import Container from "@/components/Container";
import Button from "@/components/Button";
import SectionHeading from "@/components/SectionHeading";
import ServiceCard from "@/components/ServiceCard";
import AudienceCard from "@/components/AudienceCard";
import RevealOnScroll from "@/components/RevealOnScroll";
import Placeholder from "@/components/Placeholder";
import Carousel from "@/components/Carousel";
import ComingSoon from "@/components/ComingSoon";
import { site } from "@/data/site";
import { services } from "@/data/services";
import { audiences } from "@/data/audiences";

export default function HomePage() {
  // Temporary holding page. Flip site.constructionMode to false to show the real home.
  if (site.constructionMode) return <ComingSoon />;

  const audienceHighlights = audiences.slice(0, 6);

  const studioSlides = [
    { label: "Painted minis on a UV-printed board", src: "/images/studio/gameplay-minis-board.webp", alt: "Hand-painted 3D-printed miniatures on a UV-printed hex game board" },
    { label: "UV-printing custom cards", src: "/images/studio/uv-cards-printing.webp", alt: "Printing custom cards on the UV flatbed printer" },
    { label: "A shelf of painted figures", src: "/images/studio/painted-minis-lineup.webp", alt: "A lineup of painted 3D-printed character figures" },
    { label: "Resin prints on the build plate", src: "/images/studio/resin-plate.webp", alt: "Freshly printed resin miniatures lifting off the build plate" },
    { label: "The Kulworks print bench", src: "/images/studio/printer-bench.webp", alt: "The Kulworks resin printing bench" },
    { label: "UV-printing board tiles", src: "/images/studio/uv-tiles-printing.webp", alt: "Printing board game terrain tiles on the UV flatbed printer" },
    { label: "3D-printed custom prop armor", src: "/images/portfolio/filament/custom-prop-armor.webp", alt: "A full set of 3D-printed Roman-style prop armor" },
    { label: "A batch of resin minis", src: "/images/studio/resin-minis-batch.webp", alt: "A batch of freshly printed resin character miniatures" },
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
              Kulworks is a San Antonio maker studio. We turn your idea into a finished,
              physical product: custom UV card printing, UV-printed game tiles, 3D printing,
              and the design work behind all of it. We help you design your cards and build
              your prototypes, so you can hold your envisioned game and playtest it for real.
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

      {/* ===== Why Kulworks (the edge) ===== */}
      <section className="border-b border-border bg-surface/30">
        <Container className="py-16">
          <RevealOnScroll>
            <SectionHeading
              eyebrow="Why Kulworks"
              title="What sets us apart"
              intro="A local, in-house studio, not an overseas print broker."
            />
          </RevealOnScroll>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { h: "Local and US-made", p: "Designed and made in San Antonio, start to finish. No overseas shipping or middlemen." },
              { h: "Everything in-house", p: "Design and production under one roof, so quality and timing stay in our hands." },
              { h: "Fast custom design", p: "We design and lay out your cards quickly, then prototype before you commit to a full run." },
              { h: "No minimums, prototype-ready", p: "From a single prototype deck to a full run. We specialize in getting your game prototype ready to hand off to a manufacturer, so you can playtest with real, tangible cards and pieces first." },
            ].map((f) => (
              <div key={f.h} className="rounded-2xl border border-border bg-surface p-6">
                <h3 className="font-bold text-gold">{f.h}</h3>
                <p className="mt-2 text-sm text-muted">{f.p}</p>
              </div>
            ))}
          </div>
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
          {/* All five services as equal sections; card printing (lead) first + badged. */}
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((s) => (
              <ServiceCard key={s.id} service={s} featured={s.lead} />
            ))}
          </div>
          <div className="mt-8">
            <Button href="/services/" variant="ghost">All services in detail →</Button>
          </div>
        </Container>
      </section>

      {/* ===== How it works ===== */}
      <section className="border-b border-border bg-surface/30">
        <Container className="py-16">
          <RevealOnScroll>
            <SectionHeading
              eyebrow="How it works"
              title="From idea to finished product"
              intro="A simple path from your first message to cards (or prints) in hand."
            />
          </RevealOnScroll>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { n: "1", h: "Tell us about it", p: "Send your project, quantities, sizes, and timeline through the quote form." },
              { n: "2", h: "We quote and plan", p: "We reply with options and a price, then lock the scope with you." },
              { n: "3", h: "Finalize the files", p: "Bring your artwork or let us design and prep it, then get it print-ready." },
              { n: "4", h: "We make it in-house", p: "We print, 3D print, and finish your project, then get it to you." },
            ].map((s) => (
              <div key={s.n} className="rounded-2xl border border-border bg-surface p-6">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gold/15 font-extrabold text-gold">
                  {s.n}
                </div>
                <h3 className="mt-4 font-bold">{s.h}</h3>
                <p className="mt-2 text-sm text-muted">{s.p}</p>
              </div>
            ))}
          </div>
          <p className="mt-8 text-center text-muted">
            We do the card{" "}
            <Link
              href="/services/card-printing/card-design/"
              className="font-semibold text-blue hover:underline"
            >
              design and prototyping
            </Link>{" "}
            ourselves. Bring your own artwork, or we can point you to artists and 3D modelers.
          </p>
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
              intro="A few pieces across cards, tiles, and 3D. See the full gallery for the rest."
            />
          </RevealOnScroll>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <Placeholder label="Custom cards on the UV printer" src="/images/studio/uv-card-printer.webp" alt="Custom cards printing on the UV flatbed printer" ratio="aspect-[4/3]" />
            <Placeholder label="FDM printing in progress" src="/images/studio/fdm-printer.webp" alt="A part printing on the FDM printer's build plate" ratio="aspect-[4/3]" />
            <Placeholder label="A finished custom deck" src="/images/portfolio/cards/cards-displayed.webp" alt="A fanned stack of finished custom printed cards" ratio="aspect-[4/3]" />
            <Placeholder label="UV-printed map tiles" src="/images/portfolio/tiles/map-tiles.webp" alt="Assembled UV-printed board game map tiles" ratio="aspect-[4/3]" />
            <Placeholder label="3D modeling in Shapr3D" src="/images/portfolio/design/cad-3d-model.webp" alt="Designing a custom 3D model in Shapr3D" ratio="aspect-[4/3]" />
          </div>
          <div className="mt-8">
            <Button href="/portfolio/" variant="ghost">Browse the full gallery →</Button>
          </div>
        </Container>
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
