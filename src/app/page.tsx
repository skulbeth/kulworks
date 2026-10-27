import Link from "next/link";
import Container from "@/components/Container";
import Button from "@/components/Button";
import SectionHeading from "@/components/SectionHeading";
import ServiceCard from "@/components/ServiceCard";
import RevealOnScroll from "@/components/RevealOnScroll";
import Carousel from "@/components/Carousel";
import ComingSoon from "@/components/ComingSoon";
import { site } from "@/data/site";
import { services } from "@/data/services";

export default function HomePage() {
  // Temporary holding page. Flip site.constructionMode to false to show the real home.
  if (site.constructionMode) return <ComingSoon />;

  const studioSlides = [
    { label: "Painted minis on a UV-printed board", src: "/images/studio/gameplay-minis-board.webp", alt: "Hand-painted 3D-printed miniatures on a UV-printed hex game board" },
    { label: "Printed tokens, tumbling", src: "/images/studio/tokens-tumble.mp4", alt: "A stack of double-sided UV-printed game tokens toppling in slow motion and spilling across the table, both printed faces landing up" },
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
        <Container className="relative grid items-center gap-10 py-16 sm:py-24 lg:grid-cols-[1.1fr_0.9fr] lg:gap-12">
          <div className="animate-fade-up">
            <p className="mb-4 font-mono text-xs font-semibold uppercase tracking-[0.25em] text-gold">
              Game prototypes and short runs · San Antonio
            </p>
            <h1 className="text-4xl font-extrabold leading-tight sm:text-6xl lg:text-5xl xl:text-6xl">
              <span className="text-gold text-glow-gold">
                Your game on the table this week.
                <sup aria-hidden className="text-[0.5em] align-super">*</sup>
              </span>
              {" "}Cards, tiles, and 3D, made in San Antonio.
            </h1>
            <p className="mt-6 max-w-2xl text-lg text-muted sm:text-xl">
              Send print-ready files and a run of about 120 cards is printed, cut and ready to
              ship in about two days. A playtest set, a few decks, a con-ready run.
              We do the card design and the 3D modeling too, so a rough idea is enough to start.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Button href="/contact/" variant="primary" size="lg">
                Get a Quote
              </Button>
              <Button href="/portfolio/" variant="ghost" size="lg">
                See the Work
              </Button>
            </div>
            <p className="mt-6 text-sm text-muted/80">
              * Shipping permitting. Ready-to-ship time is for print-ready runs of about 120
              cards; how long it takes to reach you depends on the carrier and where you are.
              Local pickup in San Antonio skips the wait.
            </p>
          </div>
          {/* Finished work, not machines, is what sells: a printed deck fanned out at an
              angle, so the thickness and the print both read. Eager + high priority because
              it's the largest thing above the fold. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/portfolio/cards/panic-cards-spread-still.webp"
            alt="A finished custom card deck printed by Kulworks, fanned out to show the full-color card backs"
            width={1600}
            height={1067}
            fetchPriority="high"
            className="animate-fade-up w-full rounded-2xl border border-border object-cover shadow-glow"
          />
        </Container>
      </section>

      {/* ===== Prototyping, next to the studio carousel ===== */}
      <section className="border-b border-border bg-surface/30">
        <Container className="py-16">
          <RevealOnScroll>
            <div className="grid items-center gap-10 md:grid-cols-[1.15fr_0.85fr] lg:min-h-[31rem]">
              {/* Prototyping pitch (condensed from the guide); sits right of the carousel from md up */}
              <div className="md:order-last">
                <SectionHeading
                  eyebrow="Prototyping"
                  title="Between a home printer and a factory"
                  intro="Printing at home is a great, cheap way to start. A factory run of a thousand copies is a big leap, and the small-run printers in between come with a line. That gap is where we live: clean, table-ready cards and pieces in small numbers, with no huge minimum, usually in your hands in days instead of waiting your turn."
                />
                {/* The numbers behind "fast" (same figures as the turnaround FAQ in data/faq.ts). */}
                <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-2 font-mono text-sm font-semibold text-gold">
                  <li>About 2 days to ship</li>
                  <li>Runs of about 120 cards</li>
                  <li>No minimum</li>
                </ul>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Button href="/guides/print-and-play-vs-real-prototype/" variant="ghost">
                    Print-and-play vs. a real prototype →
                  </Button>
                  <Button href="/contact/" variant="gold">Get a quote</Button>
                </div>
              </div>
              <Carousel slides={studioSlides} />
            </div>
          </RevealOnScroll>
        </Container>
      </section>

      {/* ===== Intro, with the portfolio where the carousel used to be ===== */}
      <section className="border-b border-border">
        <Container className="py-16">
          <RevealOnScroll>
            <div className="grid items-center gap-10 md:grid-cols-[0.85fr_1.15fr] lg:min-h-[31rem]">
              <div>
                <SectionHeading
                  eyebrow="Inside the shop"
                  title="Every material, under one roof"
                  intro="Custom cards, UV-printed tiles, FDM and resin 3D printing, and the design behind it all. From a first prototype deck to a finished run, it's made right here. Take a look."
                />
                <div className="mt-6 flex flex-wrap gap-3">
                  <Button href="/about/" variant="ghost">About the shop</Button>
                  <Button href="/portfolio/" variant="gold">Browse the full gallery →</Button>
                </div>
              </div>

              {/* Portfolio: same 3:2 frame as the carousel so the rows match */}
              <a
                href="/portfolio/"
                className="group relative block w-full overflow-hidden rounded-2xl border border-border shadow-lg"
              >
                <div className="relative w-full pb-[66%]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/images/portfolio/cards/cards-displayed.webp"
                    alt="A fanned stack of finished custom printed cards"
                    loading="lazy"
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                  />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-6 pt-16">
                    <p className="text-sm font-bold uppercase tracking-[0.2em] text-gold">Portfolio</p>
                    <p className="mt-1 text-2xl font-extrabold text-white sm:text-3xl">See the work →</p>
                    <p className="mt-1 text-sm text-white/80">
                      Cards, tiles, and 3D. The full gallery has the rest, and it keeps growing.
                    </p>
                  </div>
                </div>
              </a>
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
              title="Five crafts, one shop. Games first."
              intro="Most of our work is board and card games: prototype decks, printed tiles and boards, minis and pieces. The same machines turn out sports cards, awards, props and more, so if it needs designing, printing or making, there's a good chance we can help."
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

      {/* ===== The trade-off, said plainly (full version on /pricing/) ===== */}
      <section className="border-b border-border bg-surface/30">
        <Container className="py-12">
          <RevealOnScroll>
            <div className="mx-auto max-w-3xl text-center">
              <h2 className="text-2xl font-extrabold sm:text-3xl">Why we cost a little more</h2>
              <p className="mt-3 text-lg text-muted">
                You&apos;re paying for time: a few real sets made now, not a spot in someone&apos;s
                queue. Need 500 or more copies and can wait? A manufacturer will beat our price,
                and we&apos;ll tell you so.
              </p>
              <div className="mt-6 flex justify-center">
                <Button href="/pricing/" variant="ghost">See pricing →</Button>
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
            Tell us what you&apos;re building and we&apos;ll get back to you with next steps and a quote.
          </p>
          <div className="mt-8 flex justify-center">
            <Button href="/contact/" variant="gold" size="lg">Start a Project</Button>
          </div>
        </Container>
      </section>
    </>
  );
}
