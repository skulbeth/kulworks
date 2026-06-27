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
            eyebrow="About"
            title="A maker studio, end to end"
            intro="Kulworks exists to take an idea all the way to a finished, physical thing you can hold, without bouncing between vendors."
          />
        </Container>
      </section>

      <section className="border-b border-border">
        <Container className="py-16">
          <div className="grid items-center gap-10 md:grid-cols-2">
            <Placeholder label="Maker / studio portrait" ratio="aspect-[4/3]" />
            <div className="space-y-4 text-lg text-muted">
              <p>
                Kulworks is a multi-craft maker studio. We design and produce in-house
                across several materials: printing custom cards, UV-printing board game
                tiles, and 3D printing in both filament and resin, plus the 3D modeling
                and design work behind all of it.
              </p>
              <p>
                Working across crafts means a project doesn&apos;t get handed off and lost
                in translation. The same studio that lays out your cards prints them, and the
                same hands that model a part print it. That keeps quality high and
                turnaround quick, whether it&apos;s a single prototype or a short run.
              </p>
              <p>
                We build our own games too, like{" "}
                <span className="font-semibold text-foreground">Role to Reign</span>, so
                we&apos;re not only printing your project. We&apos;re making the same
                kinds of things we&apos;d want for ourselves.
              </p>
            </div>
          </div>
        </Container>
      </section>

      <section className="border-b border-border bg-surface/30">
        <Container className="py-16">
          <div className="grid gap-6 sm:grid-cols-3">
            {[
              { h: "In-house", p: "Design through production under one roof, with no outsourcing." },
              { h: "Multi-material", p: "Cards, tiles, filament, and resin, matched to the job." },
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
