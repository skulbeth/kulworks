import type { Metadata } from "next";
import Link from "next/link";
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
            title="A San Antonio maker shop, end to end"
            intro="Kulworks takes an idea all the way to a finished, physical thing you can hold, without bouncing between vendors or sending it overseas."
          />
        </Container>
      </section>

      <section className="border-b border-border">
        <Container className="py-16">
          <div className="grid items-center gap-10 md:grid-cols-2">
            <Placeholder label="Maker / shop portrait" src="/images/studio/maker-portrait.webp" alt="Sam, the maker behind Kulworks, wearing a full set of armor he designed and 3D-printed himself" ratio="aspect-[4/3]" />
            <div className="space-y-4 text-lg text-muted">
              <p>
                Kulworks is a San Antonio maker shop. Card printing is what we do most,
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
                designed, printed, and finished by us right here. We have done every step your
                project needs, from design and prototyping to printing, boxes, and delivery,
                for our own games. We know how to make yours because we have already made ours.
              </p>
            </div>
          </div>
        </Container>
      </section>

      <section className="border-b border-border bg-surface/30">
        <Container className="py-16">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-border bg-surface p-6">
              <h3 className="text-lg font-bold text-gold">Local and in-house</h3>
              <p className="mt-2 text-muted">
                Every step, design through production, is made right here in San Antonio, with no
                outsourcing and no overseas middlemen.
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-surface p-6">
              <h3 className="text-lg font-bold text-gold">Fast custom design</h3>
              <p className="mt-2 text-muted">
                We handle the{" "}
                <Link href="/services/card-printing/card-design/" className="font-semibold text-blue hover:underline">
                  card design and prototyping
                </Link>{" "}
                for you, then prototype before you commit to a full run.
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-surface p-6">
              <h3 className="text-lg font-bold text-gold">No minimums, prototype-ready</h3>
              <p className="mt-2 text-muted">
                From a single deck to a full run. We get your prototype ready to hand to a
                manufacturer, so you can playtest with real, tangible pieces first.
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-surface p-6">
              <h3 className="text-lg font-bold text-gold">Maker-credible</h3>
              <p className="mt-2 text-muted">
                We design and ship our own games, so we know how to make yours too.
              </p>
            </div>
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
