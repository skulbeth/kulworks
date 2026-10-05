import Link from "next/link";
import Container from "@/components/Container";
import Button from "@/components/Button";
import SectionHeading from "@/components/SectionHeading";
import ServiceCard from "@/components/ServiceCard";
import RevealOnScroll from "@/components/RevealOnScroll";
import Placeholder from "@/components/Placeholder";
import Carousel from "@/components/Carousel";
import ComingSoon from "@/components/ComingSoon";
import { site } from "@/data/site";
import { services } from "@/data/services";

export default function HomePage() {
  // Temporary holding page. Flip site.constructionMode to false to show the real home.
  if (site.constructionMode) return <ComingSoon />;

  const studioSlides = [
    { label: "Painted minis on a UV-printed board", src: "/images/studio/gameplay-minis-board.webp", alt: "Hand-painted 3D-printed miniatures on a UV-printed hex game board" },
    { label: "Cut, then stacked", src: "/images/studio/hex-cut-and-stacked.mp4", alt: "Pulling the clicker press handle to cut a UV-printed hex tile, lifting the board clear and popping the finished piece out of the die, then stacks of the completed run sorted across the bench" },
    { label: "Custom 3D-printed awards", src: "/images/studio/custom-awards-trio.webp", alt: "Three custom race awards designed and 3D printed by Kulworks: a number one, a runner medallion, and a tower topper on UV-printed black bases" },
    { label: "Cards printed and cured", src: "/images/studio/cards-printing-and-sheet.mp4", alt: "A card run curing under the UV lamps on the flatbed, then the finished sheet of full-colour character cards" },
    { label: "A shelf of painted figures", src: "/images/studio/painted-minis-lineup.webp", alt: "A lineup of painted 3D-printed character figures" },
    { label: "Resin prints, plate to batch", src: "/images/studio/resin-plate-and-batch.mp4", alt: "Resin miniatures lifting off the build plate, then the finished batch laid out" },
    { label: "Boards printed both sides", src: "/images/studio/board-uv-and-double-sided.mp4", alt: "Navy and gold game board panels printing on the UV flatbed under the curing lamps, then a finished panel flipped to show both sides in register" },
    { label: "Finished decks in hand", src: "/images/studio/deck-printed-and-riffled.mp4", alt: "A finished Role to Reign card held up to show its printed face, then a PANIC deck cascading from its backs into a fan of colour-coded number cards" },
    { label: "3D-printed custom prop armor", src: "/images/portfolio/filament/custom-prop-armor.webp", alt: "A full set of 3D-printed Roman-style prop armor" },
  ];
  return (
    <>
      {/* ===== Hero ===== */}
      <section className="relative overflow-hidden border-b border-border">
        <div className="pointer-events-none absolute inset-0 bg-gradient-radial from-primary/10 via-transparent to-transparent" />
        <Container className="relative py-20 sm:py-28">
          <div className="animate-fade-up">
            <p className="mb-4 font-mono text-xs font-semibold uppercase tracking-[0.25em] text-gold">
              Multi-craft maker shop
            </p>
            <h1 className="text-4xl font-extrabold leading-tight sm:text-6xl">
              <span className="text-gold text-glow-gold">Cards, tiles, and 3D.</span>
              {" "}Designed and made in San Antonio.
            </h1>
            <p className="mt-6 max-w-2xl text-lg text-muted sm:text-xl">
              UV-printed cards, tiles and boards, and 3D printing in filament and resin.
              Game prototypes and small-run batches: poker-size card decks and more. We do
              the card design and the 3D modeling too, so a rough idea is enough to start.
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
                  eyebrow="Inside the shop"
                  title="Every material, under one roof"
                  intro="Custom cards, UV-printed tiles, FDM and resin 3D printing, and the design behind it all. From a first prototype deck to a finished run, it's made right here. Take a look."
                />
                <div className="mt-6">
                  <Button href="/about/" variant="ghost">About the shop</Button>
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
              eyebrow="Services & who it's for"
              title="Five crafts, made for teams, designers, and sellers"
              intro="Card printing is what we do most, for sports teams, schools, clubs, and game and card designers. If it needs designing, printing, or making, there's a good chance we can help."
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

      {/* ===== Prototyping + Portfolio (one section, side by side) ===== */}
      <section className="border-b border-border bg-surface/30">
        <Container className="py-16">
          <RevealOnScroll>
            <div className="grid items-stretch gap-6 md:grid-cols-2">
              {/* Prototyping pitch (condensed from the guide) */}
              <div className="flex flex-col rounded-2xl border border-border bg-surface p-8">
                <p className="text-sm font-bold uppercase tracking-[0.2em] text-gold">Prototyping</p>
                <h2 className="mt-2 text-3xl font-extrabold sm:text-4xl">
                  Between a home printer and a factory
                </h2>
                <p className="mt-5 text-lg text-muted">
                  Printing at home is a great, cheap way to start. A factory run of a thousand copies
                  is a big leap. The gap between them is where we live: clean, table-ready cards and
                  pieces in small numbers, with no huge minimum, so your game looks and plays like the
                  real thing while you&apos;re still refining it.
                </p>
                <div className="mt-auto flex flex-wrap gap-3 pt-7">
                  <Button href="/guides/print-and-play-vs-real-prototype/" variant="ghost">
                    Print-and-play vs. a real prototype →
                  </Button>
                  <Button href="/contact/" variant="gold">Get a quote</Button>
                </div>
              </div>

              {/* Portfolio */}
              <div className="flex flex-col rounded-2xl border border-border bg-surface p-8">
                <Placeholder
                  label="Custom printed cards"
                  src="/images/portfolio/cards/cards-displayed.webp"
                  alt="A fanned stack of finished custom printed cards"
                  ratio="aspect-[4/3]"
                  className="rounded-2xl"
                />
                <SectionHeading
                  className="mt-6"
                  eyebrow="Portfolio"
                  title="See the work"
                  intro="A sample of what we make, across cards, tiles, and 3D. The full gallery has the rest, and it keeps growing."
                />
                <div className="mt-auto pt-6">
                  <Button href="/portfolio/" variant="gold" size="lg">
                    Browse the full gallery →
                  </Button>
                </div>
              </div>
            </div>
          </RevealOnScroll>
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
