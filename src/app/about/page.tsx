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
            <Placeholder label="Maker / studio portrait" src="/images/studio/maker-portrait-smiling.webp" alt="The maker behind Kulworks in the studio" ratio="aspect-[4/3]" />
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
                <span className="font-semibold text-foreground">Role to Reign</span>, our
                fantasy-inspired game, has 750 world and character-building cards, all
                designed and printed by us. So we&apos;re not just printing your project,
                we&apos;re making the same kinds of things we&apos;d want ourselves.
              </p>
            </div>
          </div>
        </Container>
      </section>

      <section className="border-b border-border bg-surface/30">
        <Container className="py-16">
          <div className="grid gap-6 sm:grid-cols-3">
            {[
              { h: "Local and US-made", p: "Designed and made in San Antonio, never sent overseas." },
              { h: "In-house, end to end", p: "Design through production under one roof, with no outsourcing." },
              { h: "Maker-credible", p: "We design and ship our own games, not only other people's." },
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
