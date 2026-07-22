import type { Metadata } from "next";
import Container from "@/components/Container";
import SectionHeading from "@/components/SectionHeading";
import Placeholder from "@/components/Placeholder";
import Button from "@/components/Button";
import JsonLd from "@/components/JsonLd";
import { breadcrumbSchema } from "@/lib/structured-data";

export const metadata: Metadata = {
  title: "About",
  description:
    "Kulworks is a San Antonio multi-craft maker studio that takes projects from design to finished physical product, in-house, across cards, tiles, and 3D printing.",
  alternates: { canonical: "/about/" },
};

export default function AboutPage() {
  return (
    <>
      <JsonLd
        data={breadcrumbSchema([
          { name: "Home", path: "/" },
          { name: "About", path: "/about/" },
        ])}
      />
      <section className="border-b border-border">
        <Container className="py-16">
          <SectionHeading
            as="h1"
            eyebrow="About"
            title="A San Antonio maker studio, end to end"
            intro="Kulworks takes an idea all the way to a finished, physical thing you can hold, without bouncing between vendors or sending it overseas."
          />
        </Container>
      </section>

      <section className="border-b border-border">
        <Container className="py-16">
          <div className="grid items-center gap-10 md:grid-cols-2">
            <Placeholder label="Maker / studio portrait" src="/images/studio/maker-portrait.webp" alt="Sam, the maker behind Kulworks, wearing a full set of armor he designed and 3D-printed himself" ratio="aspect-[4/3]" />
            <div className="space-y-4 text-lg text-muted">
              <p>
                Kulworks is a San Antonio maker studio. Card printing is what we do most,
                and we work across materials: custom UV cards, UV-printed board game tiles,
                FDM and resin 3D printing, plus the design work behind all of it. Everything
                is made in-house, right here, not sent overseas.
              </p>
              <p>
                Working across crafts under one roof means a project doesn&apos;t get handed
                off and lost in translation. We design the card structure, fill it with your
                content, and go straight to print, so quality and timing stay in our hands,
                whether it&apos;s a single prototype or a short run.
              </p>
              <p>
                We build our own games too.{" "}
                <a
                  href="https://roletoreign.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-blue hover:underline"
                >
                  Role to Reign
                </a>
                , our fantasy-inspired game, has 750 world- and character-building cards, all
                designed, printed, and finished by us right here. We&apos;ve done every step your
                project needs, from design and prototyping to printing, boxes, and delivery,
                for our own games. So we don&apos;t just print your project; we know how to
                make yours, because we&apos;ve already made ours.
              </p>
            </div>
          </div>
        </Container>
      </section>

      <section className="border-b border-border bg-surface/30">
        <Container className="py-16">
          <div className="grid gap-6 sm:grid-cols-3">
            {[
              { h: "Local and US-made", p: "Designed and made right here in San Antonio." },
              { h: "In-house, end to end", p: "Design through production under one roof, with no outsourcing." },
              { h: "Maker-credible", p: "We design and ship our own games, so we know how to make yours too." },
            ].map((b) => (
              <div key={b.h} className="rounded-2xl border border-border bg-surface p-6">
                <h3 className="text-lg font-bold text-gold">{b.h}</h3>
                <p className="mt-2 text-muted">{b.p}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      <section>
        <Container className="py-16 text-center">
          <h2 className="text-2xl font-extrabold sm:text-3xl">Let&apos;s build something.</h2>
          <div className="mt-6 flex justify-center">
            <Button href="/contact/" variant="gold" size="lg">Get a Quote</Button>
          </div>
        </Container>
      </section>
    </>
  );
}
